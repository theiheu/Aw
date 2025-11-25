#!/bin/bash
cd "$(dirname "$0")"
# Create passwd file with proper permissions
docker run --rm -v "$(pwd)"/config:/mosquitto/config eclipse-mosquitto:2 sh -c 'mosquitto_passwd -c /mosquitto/config/passwd weighuser <<< $'"'"'weighpass123\nweighpass123'"'"'' && chmod 644 /mosquitto/config/passwd


