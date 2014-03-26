jQuery.fn.exists = function(){ return this.length>0; };
console.log('page matched. running prxdevsitemods');

var getHostnameMd5 = function(href) {
    var l = document.createElement("a");
    l.href = href;
    return md5(l.hostname);
};

var hostMd5 = getHostnameMd5(document.URL.toLowerCase());
var isValidSite = hostMd5 == 'e2d248678b12356a39e437792090fe25' || hostMd5 == '0005c1ca8320c9550456458f77244eff';
var hasEnabledScrolling = false;

if (isValidSite) {
	console.log('host matched. continuing to run prxdevsitemods');
	var contentscopefunctions = document.createElement("script");
	contentscopefunctions.src = chrome.extension.getURL("assets/js/content-scope-functions.js");
	(document.head||document.documentElement).appendChild(contentscopefunctions);

	$(function () {
		var currentSettings;
		var insertedBodyKeypress;
		
		chrome.runtime.sendMessage({ "eventName": "pageLoaded" });
		chrome.runtime.sendMessage({ "eventName": "getSettings" }, function(settings) { refreshUsingSettings(settings); });

		function onMessage(request, sender, responseCallback) {
			console.log('received request');
			console.log(request);

			if (request && request.eventName) {
				if (request.eventName == "uiException") {
					var err = request.errorText;
					alert('Something bad happened. You should probably reload.\n\n' + err);
				}
				else if (request.eventName == "settingsUpdated") {
					refreshUsingSettings(request.settings);
				}
			}
		}

		chrome.runtime.onMessage.addListener(onMessage);
		
		function refreshUsingSettings(receivedSettings) {
			currentSettings = receivedSettings;

			displayGoToIssue(receivedSettings.displayGoToIssue);
			
			callWindowReceivePrxDevSiteModsSettings(receivedSettings);
		}
		
		function callWindowReceivePrxDevSiteModsSettings(receivedSettings) {
			console.log('Calling ReceivePrxDevSiteModsSettings(' + JSON.stringify(receivedSettings) + ');');
			var s = document.createElement("script");
			s.setAttribute('type', 'text/javascript');
			s.innerHTML = 'ReceivePrxDevSiteModsSettings(' + JSON.stringify(receivedSettings) + ');';
			(document.head||document.documentElement).appendChild(s);
		}
		
		function displayGoToIssue(displayGoToIssue) {
			if (/IssueMyListAdvanced.aspx/i.test(document.URL)) {
				var alreadyExists = $('#issueDirectRow').length > 0;
				if (alreadyExists) {
					if (!displayGoToIssue) {
						$('#issueDirectRow').remove();
					}
				}
				else {
					if (displayGoToIssue) {
						var div = $('<div id="issueDirect" style="display: table-cell; padding-left: 15px" class="FormElement"></div>');
						var input = $("<input id='issueNumberDirect' type='text' value=''></input>");
						div.append(input);
						var button = $("<input type='button' value='Go' />");
						button.click(function() {
							window.open('IssueEdit.aspx?IssueNumber=' + input.val());
						});
						div.append(button);
						var label = $('<span class="FormLabel" style="display: table-cell;">Go to Issue #</span>');
						var row = $('<div id="issueDirectRow" style="display: table-row;"></div>');
						var innerRow = $('<div></div>');
						row.append(innerRow);
						innerRow.append(label);
						innerRow.append(div);
						
						$('#ctl00_ContentPlaceHolder2_divChooseDeveloper').parent().parent().prepend(row);
						
						if (!insertedBodyKeypress) {
							$('body').keypress(function(evt) {
								if (evt.which == 47 && $('#issueNumberDirect').length > 0) {
									evt.preventDefault();
									$('#issueNumberDirect').focus();
								}
							});
							insertedBodyKeypress = true;
						}
						
						$('#issueNumberDirect').keypress(function(evt) {
							if (evt.which == 13) {
								evt.preventDefault();
								
								window.open('IssueEdit.aspx?IssueNumber=' + this.value);
							}
							else if (evt.which > 31 && (evt.which < 48 || evt.which > 57)) {
								evt.preventDefault();
							}
						});
						
						$('#issueNumberDirect').keyup(function(evt) {
							if (/\D/.test($(this).val())) {
								$(this).val($(this).val().replace(/\D/g, ''));
							}
						});
						
						$('#issueNumberDirect').focus(function() {
							$(this).select();
							window.setTimeout(function() { $('#issueNumberDirect').select(); }, 100);
						});
					}
				}
			}
		} // displayGoToIssue
		
		// Re-enable scroll in separate windows for IssueEdit
		if (window.innerHeight != 830 && /IssueEdit.aspx/i.test(document.URL)) {
			$('html,body,form,.GreyFrameWhiteAdminBG').css('height', 'auto').css('overflow-y', 'visible').css('overflow-x', 'visible');
			hasEnabledScrolling = true;
		}
		else if (/IssueEdit.aspx/i.test(document.URL)) {
			$(window).resize(function() {
				if (!hasEnabledScrolling) {
					$('html,body,form,.GreyFrameWhiteAdminBG').css('height', 'auto').css('overflow-y', 'visible').css('overflow-x', 'visible');
					hasEnabledScrolling = true;
				}
			});
		}
	});
}