#!/bin/sh

URL_OPEN_TIMEOUT="${URL_OPEN_TIMEOUT:-30}"  # Set default to 30 if not set
FIRST_SLEEP_DURATION=$(($URL_OPEN_TIMEOUT / 3))

# Initialize an empty string for the proxy argument
PROXY_ARG=""

# Check if the CHROME_PROXY environment variable is set
if [ -n "$CHROME_PROXY" ]; then
	    # Form the proxy argument
	PROXY_ARG="--proxy-server=$CHROME_PROXY"
fi

rm -rf ~/.config/google-chrome/Singleton*
xdg-settings set default-web-browser google-chrome

urls=$(echo $TARGET_URLS | tr " ||; " "\n")
sleep $FIRST_SLEEP_DURATION
for url in $urls
do
	google-chrome $PROXY_ARG --load-extension=~/PTRentNotifier/ --disable-accelerated-2d-canvas --disable-gpu --hide-crash-restore-bubble --no-sandbox "$url" & sleep $URL_OPEN_TIMEOUT;
	echo "Opening URL: $url"
done
