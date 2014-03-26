var Version = "0.1";
var matchingUrls = [
	"*://*/SupportCenter/*.aspx*",
	"*://*/LocationSearch.aspx*",
	"*://*/Updater/*.aspx*" ];
	
function onMessage(request, sender, responseCallback)
{
	if (request && request.eventName)
	{
		if (request.eventName == "pageLoaded")
		{
			console.log('received pageLoaded');
			pageLoaded(sender);
		}
		else if (request.eventName == "getSettings" || request.eventName == "resetSettings")
		{
			console.log('received ' + request.eventName);
			if (request.eventName == "resetSettings")
			{
				chrome.storage.sync.clear(function () {
					getSettings(responseCallback);
				});
			}
			else
			{
				getSettings(responseCallback);
			}
			return true;
		}
		else if (request.eventName == "saveSettings")
		{
			console.log('received saveSettings');
			saveSettings(request.dto, responseCallback);
			return true;
		}
		else if (request.eventName == "raiseNotification")
		{
			console.log('received raiseNotification');
			raiseNotification(request.title, request.message, sender.tab.id, request.settings, responseCallback);
			return true;
		}
	}
};

chrome.runtime.onMessage.addListener(onMessage);

var defaultOptions =
{
	"displayGoToIssue": true,
	"suppressEditIssuePopup": true,
	"suppressAllPopups": true
};

function getSettings(responseCallback)
{
	chrome.storage.sync.get('settings', function(data)
	{
		console.log('pulled from sync');
		console.log(data);
		var settings = $.extend(defaultOptions, data.settings);
		responseCallback(settings);
	});
}

function saveSettings(settings, responseCallback)
{
	console.log('push to sync');
	console.log(settings);

	chrome.storage.sync.set({ 'settings': settings }, function()
	{
		var err = chrome.runtime.lastError;
		if (err)
		{
			responseCallback({ 'success': false, 'errorMessage': err });
		}

		responseCallback({ 'success': true, 'errorMessage': null });

		sendOneWayMessageToContentScript({ "eventName": "settingsUpdated", "settings": settings });

		console.log('sent settingsUpdated message');
	});
}

function pageLoaded(sender, logonName)
{
	console.log('tab loaded: ' + sender.tab.id);
	chrome.pageAction.show(sender.tab.id);
}

var getHostnameMd5 = function(href) {
    var l = document.createElement("a");
    l.href = href;
    return md5(l.hostname);
};

function isValidSite(url) {
	var hostMd5 = getHostnameMd5(url);
	var isValidSite = hostMd5 == 'e2d248678b12356a39e437792090fe25' || hostMd5 == '0005c1ca8320c9550456458f77244eff';
	return isValidSite;
}

function sendOneWayMessageToContentScript(message)
{
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (tabs[i] !== undefined) {
						if (isValidSite(tabs[i].url)) {
							console.log('sending message to tab id: ' + tabs[i].id);

							chrome.tabs.sendMessage(tabs[i].id, message, function() {
								if (chrome.runtime.lastError)
								{
									console.log('error sending to tab:');
									console.log(chrome.runtime.lastError);
								}
							});
						}
					}
				}
			}
		});
	}
}

function raiseContentError(errorText)
{
	sendOneWayMessageToContentScript({ "eventName": "uiException", "errorText": errorText });
}

function raiseNotification(title, message, tabID, settings, responseCallback)
{
	if (lastNotificationTime && new Date() < new Date(lastNotificationTime + acceptableNotificationTime))
	{
		// Too soon, but this isn't working yet
		responseCallback();
	}
	else
	{
		var notification = webkitNotifications.createNotification(chrome.runtime.getURL("assets/img/niblet-48.png"), title, message);
		notification.onclick = function() { notification.cancel(); chrome.tabs.update(tabID, { active: true }); };
		notification.show();
		// Not sure if we should auto close since you want to see it
		//setTimeout(function() { notification.close(); }, 10000);

		if (settings && settings.notificationSound)
		{
			console.log(chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg"));
			setTimeout(function() {
				var notificationAudio = new Audio();
				notificationAudio.src = chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg");
				notificationAudio.play();
			}, 1);
		}

		lastNotificationTime = new Date();

		responseCallback();
	}
}

function raiseUpdateNotification(message)
{
	var title = 'Daily Status Mods Updated';
	//var notification = webkitNotifications.createNotification(chrome.runtime.getURL("assets/img/niblet-48.png"), title, message);
	var notification = webkitNotifications.createHTMLNotification(chrome.runtime.getURL('updatenotification.html'));
	notification.onclick = function() { notification.cancel(); chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }); };
	notification.show();
}

chrome.notifications.onClicked.addListener(function(incomingNotificationID) {
	if (incomingNotificationID == notificationID)
	{
		if (lastNotificationTabID)
		{
			chrome.tabs.update(lastNotificationTabID, { active: true });
		}
	}
});

chrome.runtime.onInstalled.addListener(function(details) {
	/*
	if (details.reason == 'install') // This is annoying with frequent updates... || details.reason == 'update')
	{
		chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }, function() { });
	}
	else if (details.reason == 'update')
	{
		raiseUpdateNotification();
	}
	*/
	
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (isValidSite(tabs[i].url)) {
						console.log('reloading matching tab ' + tabs[i].id + ' with url ' + tabs[i].url);
						chrome.tabs.reload(tabs[i].id);
					}
				}
			}
		});
	}
});