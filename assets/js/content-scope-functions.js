window.popupNamedWindowOld = window.popupNamedWindow;

window.popupNamedWindow = function(url, guid, width, height) {
	if (currentSettings.suppressAllPopups ||
		(/^IssueEdit/i.test(url) && currentSettings.suppressEditIssuePopup)) {
		window.open(url);
	}
	else {
		popupNamedWindowOld(url, guid, width, height);
	}
}

window.ReceivePrxDevSiteModsSettings = function(settings) {
	window.currentSettings = settings;
}

console.log('loaded content-scope-functions.js');