def run(context):
    return {
        "pong": True,
        "protocol_version": context.request.version,
        "request_id": context.request.request_id,
    }
