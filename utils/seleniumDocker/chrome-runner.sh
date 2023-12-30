rm -rf ~/.config/google-chrome/Singleton* 
xdg-settings set default-web-browser google-chrome

urls=$(echo $TARGET_URLS | tr " ||; " "\n")

for url in $urls
do
	google-chrome --load-extension=~/PTRentNotifier/ --disable-accelerated-2d-canvas --disable-gpu --hide-crash-restore-bubble  --no-sandbox \
	$url & sleep 30;
	echo "Opening URL: $url"
done
