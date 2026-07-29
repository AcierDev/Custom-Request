import type {
  OpenCascadeInstance,
  Quantity_Color,
  TDF_Label,
  TopLoc_Location,
  TopoDS_Compound,
  TopoDS_Shape,
  TopoDS_Solid,
  XCAFDoc_ColorTool,
  XCAFDoc_ColorType,
  STEPControl_StepModelType,
} from "replicad-opencascadejs/src/replicad_with_exceptions";
import {
  WEDGE_FACE_CORNER_INDEXES,
  getNormalizedWedgeCorners,
} from "../wedgeGeometry.ts";
import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
import {
  applyStepHeaderMetadata,
  type StepExportMetadata,
} from "./stepMetadata.ts";
import type {
  StepExportResult,
  StepModelPlan,
  StepTransform,
} from "./stepTypes.ts";

interface Disposable {
  delete(): void;
}

interface EnumValue {
  value: number;
}

const deleteSafely = (value: Disposable | null | undefined): void => {
  try {
    value?.delete();
  } catch {
    // A one-shot worker is torn down after export; cleanup must not mask output.
  }
};

const getEnumValue = (value: unknown): number =>
  (value as EnumValue).value;

const makeExtendedString = (
  openCascade: OpenCascadeInstance,
  value: string,
) => new openCascade.TCollection_ExtendedString_2(value, true);

const setLabelName = (
  openCascade: OpenCascadeInstance,
  label: TDF_Label,
  name: string,
): void => {
  const extendedName = makeExtendedString(openCascade, name);
  const nameHandle = openCascade.TDataStd_Name.Set_1(label, extendedName);
  deleteSafely(nameHandle);
  deleteSafely(extendedName);
};

const makeEmptyCompound = (
  openCascade: OpenCascadeInstance,
): TopoDS_Compound => {
  const compound = new openCascade.TopoDS_Compound();
  const builder = new openCascade.TopoDS_Builder();
  builder.MakeCompound(compound);
  deleteSafely(builder);
  return compound;
};

const makeLocation = (
  openCascade: OpenCascadeInstance,
  transform: StepTransform,
): TopLoc_Location => {
  const transformation = new openCascade.gp_Trsf_1();
  const origin = new openCascade.gp_Pnt_3(
    STEP_EXPORT_CONFIG.originCoordinate,
    STEP_EXPORT_CONFIG.originCoordinate,
    STEP_EXPORT_CONFIG.originCoordinate,
  );
  const zDirection = new openCascade.gp_Dir_4(
    STEP_EXPORT_CONFIG.originCoordinate,
    STEP_EXPORT_CONFIG.originCoordinate,
    STEP_EXPORT_CONFIG.positiveAxisDirection,
  );
  const zAxis = new openCascade.gp_Ax1_2(origin, zDirection);
  const translation = new openCascade.gp_Vec_4(
    transform.translationMm[0],
    transform.translationMm[1],
    transform.translationMm[2],
  );

  transformation.SetRotation_1(zAxis, transform.rotationZRadians);
  transformation.SetTranslationPart(translation);
  const location = new openCascade.TopLoc_Location_2(transformation);

  deleteSafely(translation);
  deleteSafely(zAxis);
  deleteSafely(zDirection);
  deleteSafely(origin);
  deleteSafely(transformation);
  return location;
};

const buildFace = (
  openCascade: OpenCascadeInstance,
  cornerIndexes: readonly number[],
  physicalScaleMm: number,
): TopoDS_Shape => {
  const corners = getNormalizedWedgeCorners();
  const points = cornerIndexes.map((cornerIndex) => {
    const corner = corners[cornerIndex];
    return new openCascade.gp_Pnt_3(
      corner.x * physicalScaleMm,
      corner.y * physicalScaleMm,
      corner.z * physicalScaleMm,
    );
  });
  const edgeMakers = points.map(
    (point, index) =>
      new openCascade.BRepBuilderAPI_MakeEdge_3(
        point,
        points[(index + STEP_EXPORT_CONFIG.positiveAxisDirection) % points.length],
      ),
  );
  const edges = edgeMakers.map((maker) => maker.Edge());
  const wireMaker = new openCascade.BRepBuilderAPI_MakeWire_2(
    edges[STEP_EXPORT_CONFIG.firstFaceEdgeIndex],
  );

  for (
    let edgeIndex = STEP_EXPORT_CONFIG.firstAdditionalFaceEdgeIndex;
    edgeIndex < edges.length;
    edgeIndex += STEP_EXPORT_CONFIG.positiveAxisDirection
  ) {
    wireMaker.Add_1(edges[edgeIndex]);
  }

  const wire = wireMaker.Wire();
  const faceMaker = new openCascade.BRepBuilderAPI_MakeFace_15(wire, true);
  const face = faceMaker.Face();

  deleteSafely(faceMaker);
  deleteSafely(wire);
  deleteSafely(wireMaker);
  edges.forEach(deleteSafely);
  edgeMakers.forEach(deleteSafely);
  points.forEach(deleteSafely);
  return face;
};

const buildWedgeSolid = (
  openCascade: OpenCascadeInstance,
  physicalScaleMm: number,
): TopoDS_Solid => {
  const sewing = new openCascade.BRepBuilderAPI_Sewing(
    STEP_EXPORT_CONFIG.sewingToleranceMillimeters,
    true,
    true,
    true,
    false,
  );
  const faces = WEDGE_FACE_CORNER_INDEXES.map((cornerIndexes) =>
    buildFace(openCascade, cornerIndexes, physicalScaleMm),
  );
  faces.forEach((face) => sewing.Add(face));

  const progress = new openCascade.Message_ProgressRange_1();
  sewing.Perform(progress);
  const sewedShape = sewing.SewedShape();
  const shell = openCascade.TopoDS.Shell_1(sewedShape);
  const solidMaker = new openCascade.BRepBuilderAPI_MakeSolid_3(shell);
  const solid = solidMaker.Solid();
  const analyzer = new openCascade.BRepCheck_Analyzer(solid, true, false);

  if (!analyzer.IsValid_2()) {
    throw new Error("STEP export could not build a valid square solid.");
  }

  deleteSafely(analyzer);
  deleteSafely(solidMaker);
  deleteSafely(shell);
  deleteSafely(sewedShape);
  deleteSafely(progress);
  faces.forEach(deleteSafely);
  deleteSafely(sewing);
  return solid;
};

const buildBoxSolid = (
  openCascade: OpenCascadeInstance,
  sizeMm: readonly [number, number, number],
): TopoDS_Solid => {
  const minimum = new openCascade.gp_Pnt_3(
    -sizeMm[0] / STEP_EXPORT_CONFIG.halfSizeDivisor,
    -sizeMm[1] / STEP_EXPORT_CONFIG.halfSizeDivisor,
    -sizeMm[2] / STEP_EXPORT_CONFIG.halfSizeDivisor,
  );
  const maker = new openCascade.BRepPrimAPI_MakeBox_3(
    minimum,
    sizeMm[0],
    sizeMm[1],
    sizeMm[2],
  );
  const solid = maker.Solid();
  deleteSafely(maker);
  deleteSafely(minimum);
  return solid;
};

const parseHexColor = (
  openCascade: OpenCascadeInstance,
  colorHex: string,
): Quantity_Color => {
  const color = new openCascade.Quantity_Color_1();
  if (!openCascade.Quantity_Color.ColorFromHex(colorHex, color)) {
    deleteSafely(color);
    throw new Error(`STEP export received an invalid color: ${colorHex}`);
  }
  return color;
};

const applyColor = (
  openCascade: OpenCascadeInstance,
  colorTool: XCAFDoc_ColorTool,
  label: TDF_Label,
  color: Quantity_Color,
): void => {
  colorTool.SetColor_2(
    label,
    color,
    openCascade.XCAFDoc_ColorType
      .XCAFDoc_ColorGen as unknown as XCAFDoc_ColorType,
  );
  colorTool.SetColor_2(
    label,
    color,
    openCascade.XCAFDoc_ColorType
      .XCAFDoc_ColorSurf as unknown as XCAFDoc_ColorType,
  );
};

export function exportStepModel(
  openCascade: OpenCascadeInstance,
  plan: StepModelPlan,
  metadata: StepExportMetadata,
): StepExportResult {
  const writer = new openCascade.STEPCAFControl_Writer_1();
  const documentFormat = makeExtendedString(
    openCascade,
    STEP_EXPORT_CONFIG.documentFormat,
  );
  const document = new openCascade.TDocStd_Document(documentFormat);
  const documentHandle =
    new openCascade.Handle_TDocStd_Document_2(document);
  const mainLabel = document.Main();
  const shapeToolHandle =
    openCascade.XCAFDoc_DocumentTool.ShapeTool(mainLabel);
  const colorToolHandle =
    openCascade.XCAFDoc_DocumentTool.ColorTool(mainLabel);
  const shapeTool = shapeToolHandle.get();
  const colorTool = colorToolHandle.get();
  const identityLocation = new openCascade.TopLoc_Location_1();
  const rootCompound = makeEmptyCompound(openCascade);
  const rootDefinition = shapeTool.AddShape(rootCompound, true, false);
  const squaresCompound = makeEmptyCompound(openCascade);
  const squaresDefinition = shapeTool.AddShape(
    squaresCompound,
    true,
    false,
  );
  const backboardCompound = makeEmptyCompound(openCascade);
  const backboardBuilder = new openCascade.TopoDS_Builder();
  const backboardShapes: TopoDS_Shape[] = [];

  backboardBuilder.MakeCompound(backboardCompound);
  for (const body of plan.backboard.bodies) {
    const solid = buildBoxSolid(openCascade, body.sizeMm);
    const location = makeLocation(openCascade, body.transform);
    const movedSolid = solid.Moved(location, false);
    backboardBuilder.Add(backboardCompound, movedSolid);
    backboardShapes.push(movedSolid);
    deleteSafely(location);
    deleteSafely(solid);
  }

  const backboardDefinition = shapeTool.AddShape(
    backboardCompound,
    false,
    false,
  );
  setLabelName(openCascade, rootDefinition, plan.rootName);
  setLabelName(openCascade, backboardDefinition, plan.backboard.name);
  setLabelName(openCascade, squaresDefinition, plan.squares.name);

  const backboardOccurrence = shapeTool.AddComponent_1(
    rootDefinition,
    backboardDefinition,
    identityLocation,
  );
  const squaresOccurrence = shapeTool.AddComponent_1(
    rootDefinition,
    squaresDefinition,
    identityLocation,
  );
  setLabelName(openCascade, backboardOccurrence, plan.backboard.name);
  setLabelName(openCascade, squaresOccurrence, plan.squares.name);

  const backboardColor = parseHexColor(
    openCascade,
    plan.backboard.colorHex,
  );
  applyColor(
    openCascade,
    colorTool,
    backboardDefinition,
    backboardColor,
  );
  applyColor(
    openCascade,
    colorTool,
    backboardOccurrence,
    backboardColor,
  );
  backboardShapes.forEach((shape, index) => {
    const bodyLabel = shapeTool.AddSubShape_1(backboardDefinition, shape);
    const bodyNumber = String(
      index + STEP_EXPORT_CONFIG.firstComponentNumber,
    ).padStart(STEP_EXPORT_CONFIG.componentNumberWidth, "0");
    setLabelName(
      openCascade,
      bodyLabel,
      `${STEP_EXPORT_CONFIG.backboardBodyNamePrefix} ${bodyNumber}`,
    );
    applyColor(openCascade, colorTool, bodyLabel, backboardColor);
  });

  for (const square of plan.squares.children) {
    const squareSolid = buildWedgeSolid(
      openCascade,
      square.physicalScaleMm,
    );
    const squareDefinition = shapeTool.AddShape(
      squareSolid,
      false,
      false,
    );
    const squareLocation = makeLocation(
      openCascade,
      square.transform,
    );
    const squareOccurrence = shapeTool.AddComponent_1(
      squaresDefinition,
      squareDefinition,
      squareLocation,
    );
    const squareColor = parseHexColor(openCascade, square.colorHex);

    setLabelName(openCascade, squareDefinition, square.name);
    setLabelName(openCascade, squareOccurrence, square.name);
    applyColor(openCascade, colorTool, squareDefinition, squareColor);
    applyColor(openCascade, colorTool, squareOccurrence, squareColor);

    deleteSafely(squareColor);
    deleteSafely(squareLocation);
    deleteSafely(squareSolid);
  }

  shapeTool.UpdateAssemblies();
  openCascade.XCAFDoc_DocumentTool.SetLengthUnit_1(
    documentHandle,
    STEP_EXPORT_CONFIG.documentLengthUnitMeters,
  );
  writer.SetColorMode(true);
  writer.SetNameMode(true);
  openCascade.Interface_Static.SetCVal(
    "write.step.schema",
    STEP_EXPORT_CONFIG.schema,
  );
  openCascade.Interface_Static.SetCVal(
    "write.step.unit",
    STEP_EXPORT_CONFIG.stepUnit,
  );
  openCascade.Interface_Static.SetIVal(
    "write.step.assembly",
    STEP_EXPORT_CONFIG.assemblyMode,
  );

  const progress = new openCascade.Message_ProgressRange_1();
  const singleFilePrefix = null as unknown as string;
  const transferred = writer.Transfer_1(
    documentHandle,
    openCascade.STEPControl_StepModelType
      .STEPControl_AsIs as unknown as STEPControl_StepModelType,
    singleFilePrefix,
    progress,
  );

  if (!transferred) {
    throw new Error("STEP export could not transfer the artwork.");
  }

  try {
    const status = writer.Write(STEP_EXPORT_CONFIG.virtualOutputPath);
    if (
      getEnumValue(status) !== STEP_EXPORT_CONFIG.ifSelectReturnDone
    ) {
      throw new Error("STEP export could not write the artwork.");
    }

    const output = new Uint8Array(
      openCascade.FS.readFile(STEP_EXPORT_CONFIG.virtualOutputPath, {
        encoding: "binary",
      }),
    );
    return {
      bytes: applyStepHeaderMetadata(output, metadata),
      filename: metadata.filename,
    };
  } finally {
    try {
      openCascade.FS.unlink(STEP_EXPORT_CONFIG.virtualOutputPath);
    } catch {
      // The writer may fail before creating its virtual output.
    }
    deleteSafely(progress);
    deleteSafely(backboardColor);
    backboardShapes.forEach(deleteSafely);
    deleteSafely(backboardBuilder);
    deleteSafely(backboardCompound);
    deleteSafely(squaresCompound);
    deleteSafely(rootCompound);
    deleteSafely(identityLocation);
    deleteSafely(colorToolHandle);
    deleteSafely(shapeToolHandle);
    deleteSafely(mainLabel);
    deleteSafely(documentHandle);
    deleteSafely(document);
    deleteSafely(documentFormat);
    deleteSafely(writer);
  }
}
