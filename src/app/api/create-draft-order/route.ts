import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get the session to check if the user is authenticated

    // Parse the request body
    const body = await request.json();
    const {
      dimensions,
      selectedDesign,
      shippingSpeed,
      colorPattern,
      orientation,
      customPalette,
      pricing,
    } = body;

    // Validate required fields
    if (!dimensions || !selectedDesign || !shippingSpeed || !pricing) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Shopify API credentials from environment variables
    const SHOPIFY_API_ADMIN_ACCESS_TOKEN =
      process.env.SHOPIFY_API_ADMIN_ACCESS_TOKEN;
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;

    if (!SHOPIFY_API_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_URL) {
      console.error("Missing Shopify API credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Construct the line item description
    const itemDescription = `Custom ${selectedDesign} design (${dimensions.width}" x ${dimensions.height}") - ${colorPattern} pattern, ${orientation} orientation`;

    // Prepare the draft order data
    const draftOrderData = {
      draft_order: {
        line_items: [
          {
            title: `Custom ${selectedDesign} Design`,
            price: pricing.total.toFixed(2),
            quantity: 1,
            requires_shipping: true,
            taxable: true,
            properties: [
              { name: "Width", value: `${dimensions.width}"` },
              { name: "Height", value: `${dimensions.height}"` },
              { name: "Design", value: selectedDesign },
              { name: "Shipping", value: shippingSpeed },
              { name: "Pattern", value: colorPattern },
              { name: "Orientation", value: orientation },
            ],
          },
        ],
        note: "Created from custom design tool",
        note_attributes: [
          { name: "Source", value: "Custom Design Tool" },
          {
            name: "Design Data",
            value: JSON.stringify({
              dimensions,
              selectedDesign,
              shippingSpeed,
              colorPattern,
              orientation,
              customPalette,
            }),
          },
        ],
      },
    };

    // Make the API request to Shopify with the explicit admin API endpoint
    const shopifyApiEndpoint = new URL(`${SHOPIFY_STORE_URL}`);

    // Ensure the URL has the correct structure
    if (
      !shopifyApiEndpoint.hostname.includes("myshopify.com") &&
      !shopifyApiEndpoint.hostname.includes(".shop")
    ) {
      shopifyApiEndpoint.hostname = `${shopifyApiEndpoint.hostname}`;
    }

    const fullApiUrl = `${shopifyApiEndpoint.origin}/admin/api/2025-04/draft_orders.json`;

    console.log("Using Shopify API endpoint:", fullApiUrl);
    console.log("Request data:", JSON.stringify(draftOrderData, null, 2));
    console.log("Request method:", "POST");

    const shopifyResponse = await fetch(fullApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_API_ADMIN_ACCESS_TOKEN,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(draftOrderData),
      cache: "no-store",
    });

    console.log("Response status:", shopifyResponse.status);
    console.log(
      "Response headers:",
      JSON.stringify(
        Object.fromEntries([...shopifyResponse.headers.entries()]),
        null,
        2
      )
    );

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json();
      console.error("Shopify API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create draft order", details: errorData },
        { status: shopifyResponse.status }
      );
    }

    const responseData = await shopifyResponse.json();
    console.log(
      "Shopify API response structure keys:",
      Object.keys(responseData)
    );

    // Check if we got a list of all draft orders instead of one created draft order
    if (responseData.draft_orders && !responseData.draft_order) {
      console.error(
        "ERROR: Received list of all draft orders instead of a newly created one."
      );
      console.log(
        "Got " +
          responseData.draft_orders.length +
          " draft orders in the response."
      );

      // Try to extract the latest draft order which might be our newly created one
      if (responseData.draft_orders.length > 0) {
        // Sort by creation date descending to get the most recent one
        const sortedDraftOrders = [...responseData.draft_orders].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const latestDraftOrder = sortedDraftOrders[0];
        console.log(
          "Using most recent draft order:",
          latestDraftOrder.id,
          "created at",
          latestDraftOrder.created_at
        );

        // Return the most recent draft order
        return NextResponse.json({
          success: true,
          draftOrder: latestDraftOrder,
          checkoutUrl: latestDraftOrder.invoice_url,
          warning:
            "Received list of all draft orders instead of a newly created one",
        });
      }

      return NextResponse.json(
        {
          error:
            "Failed to create draft order - received list instead of new draft",
          details: responseData,
        },
        { status: 500 }
      );
    }

    // Normal case - we got a single draft order response
    if (!responseData.draft_order) {
      console.error(
        "No draft_order in response. Got:",
        Object.keys(responseData)
      );
      return NextResponse.json(
        { error: "Failed to create draft order", details: responseData },
        { status: 500 }
      );
    }

    const draftOrder = responseData.draft_order;
    const invoiceUrl = draftOrder.invoice_url;

    // Return the draft order data and checkout URL
    return NextResponse.json({
      success: true,
      draftOrder,
      checkoutUrl: invoiceUrl,
    });
  } catch (error) {
    console.error("Error creating draft order:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
