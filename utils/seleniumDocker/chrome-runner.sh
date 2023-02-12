rm -rf /home/seluser/.config/google-chrome/Singleton* 
sleep 10;
#Just opening random url to "warm up". All this ugly hack is needed because if I open chrome with multiple urls they are not always loaded, need to do things like this to avoid
google-chrome --disable-accelerated-2d-canvas --disable-gpu --hide-crash-restore-bubble  --no-sandbox \
	"http://google.com" &
sleep 30;

urls=$(echo $TARGET_URLS | tr " ||; " "\n")

for url in $urls
do
	google-chrome --disable-accelerated-2d-canvas --disable-gpu --hide-crash-restore-bubble  --no-sandbox \
	$url & sleep 30;
	echo "Opening URL: $url"
done
