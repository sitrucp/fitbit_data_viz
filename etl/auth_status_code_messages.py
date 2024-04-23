status_code_messages = {
    # Success Codes
    200: {"type": "Success", "description": "OK"},
    201: {"type": "Success", "description": "Created"},
    204: {"type": "Success", "description": "No Content"},

    # Client Error Codes
    400: {"type": "Client Error", "description": "Bad Request"},
    401: {"type": "Client Error", "description": "Unauthorized"},
    403: {"type": "Client Error", "description": "Forbidden"},
    404: {"type": "Client Error", "description": "Not Found"},
    405: {"type": "Client Error", "description": "Method Not Allowed"},
    409: {"type": "Client Error", "description": "Conflict"},
    411: {"type": "Client Error", "description": "Length Required"},
    429: {"type": "Client Error", "description": "Too Many Requests"},
    
    # Server Error Codes
    500: {"type": "Server Error", "description": "Internal Server Error"},
    502: {"type": "Server Error", "description": "Bad Gateway"},
    503: {"type": "Server Error", "description": "Service Unavailable"},
    504: {"type": "Server Error", "description": "Gateway Timeout"},
    
    # Add more codes and descriptions here as needed
}
