# auth_get_tokens.py

import cherrypy
import os
import sys
import threading
import webbrowser
import secrets  # For generating a secure, random state
import json
from urllib.parse import urlparse, quote
from base64 import b64encode
from fitbit.api import Fitbit
from oauthlib.oauth2.rfc6749.errors import MismatchingStateError, MissingTokenError

key_path = os.getenv('key_path')
sys.path.insert(0, key_path)
from config_fitbit import config_fitbit

client_id = config_fitbit["CLIENT_ID"]
client_secret = config_fitbit["CLIENT_SECRET"]

class OAuth2Server:
    def __init__(self, client_id, client_secret, redirect_uri='http://127.0.0.1:8080/'):
        """ Initialize the OAuth2 server with PKCE and state support """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.state = secrets.token_urlsafe()
        
        self.success_html = """
            <h1>You are now authorized to access the Fitbit API!</h1>
            <br/><h3>You can close this window</h3>"""
        self.failure_html = """
            <h1>ERROR: %s</h1><br/><h3>You can close this window</h3>%s"""

        self.fitbit = Fitbit(
            client_id,
            client_secret,
            redirect_uri=redirect_uri,
            timeout=10,
        )

    def browser_authorize(self):
        """
        Open a browser to the authorization URL and spool up a CherryPy server to accept the response
        """
        # Construct the authorization URL manually to include the state
        scopes = [
            "activity", "cardio_fitness", "electrocardiogram", "heartrate",
            "location", "nutrition", "oxygen_saturation", "profile",
            "respiratory_rate", "settings", "sleep", "social",
            "temperature", "weight"
        ]
        
        scope_param = " ".join(scopes)
        auth_url = (f"https://www.fitbit.com/oauth2/authorize?response_type=code&client_id={self.client_id}"
                    f"&redirect_uri={quote(self.redirect_uri)}&scope={quote(scope_param)}&state={self.state}")
        
        threading.Timer(1, webbrowser.open, args=(auth_url,)).start()

        urlparams = urlparse(self.redirect_uri)
        cherrypy.config.update({'server.socket_host': urlparams.hostname,
                                'server.socket_port': urlparams.port})

        cherrypy.quickstart(self)

    @cherrypy.expose
    def index(self, code=None, state=None, error=None):
        """
        Receive a Fitbit response containing a verification code and state. Use the code
        to fetch the access token and validate the state.
        """
        try:
            if state != self.state:
                return self.failure_html % ("Invalid state parameter. Possible CSRF attack.", "")
            
            if code:
                # Fetch the access token using the authorization code
                token = self.fitbit.client.fetch_access_token(code)
                # Save the token to a JSON file
                token_filename = os.path.join(os.path.dirname(__file__), 'auth_tokens.json')
                with open(token_filename, 'w') as token_file:
                    json.dump(token, token_file, indent=4)
                
                return self.success_html
            else:
                return self.failure_html % ("No code provided by Fitbit.", "")
        except (MissingTokenError, MismatchingStateError) as e:
            return self.failure_html % (str(e), "")
        finally:
            # Ensure the CherryPy server is shutdown after processing the request
            self._shutdown_cherrypy()
        
    def _shutdown_cherrypy(self):
        """ Shutdown CherryPy server after a short delay """
        if cherrypy.engine.state == cherrypy.engine.states.STARTED:
            threading.Timer(1, cherrypy.engine.exit).start()

if __name__ == '__main__':
    server = OAuth2Server(config_fitbit["CLIENT_ID"], config_fitbit["CLIENT_SECRET"])
    server.browser_authorize()
