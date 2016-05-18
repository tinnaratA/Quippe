if (window.location.href.indexOf("CheckBrowser=no") == -1) {
	if (navigator.appName == 'Microsoft Internet Explorer') {
		var ieRegex = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");

		if (ieRegex.exec(navigator.userAgent) != null) {
			var version = parseFloat(RegExp.$1);

			if (version < 8) {
				window.location.href = 'BrowserCheck.htm';
			}
		}
	}
}

if (navigator.userAgent.match(/ipad|android/i)) {
	var ipadCss = document.createElement('link');

	ipadCss.type = "text/css";
	ipadCss.href = getLibsPath() + "Quippe/themes/ipad.css";
	ipadCss.setAttribute("rel", "stylesheet");

	document.getElementsByTagName('head')[0].appendChild(ipadCss);

	var ipadMetaTag = document.createElement('meta');

	ipadMetaTag.name = 'viewport';
	ipadMetaTag.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0, initial-scale=1, user-scalable=no';

	document.getElementsByTagName('head')[0].appendChild(ipadMetaTag);
}

dojoConfig = {
	parseOnLoad: true,
	async: true,
	locale: 'en-US',
	cacheBust: /nocache/i.test(window.location.search || '')
};

function getLibsPath() {
    var libsPath = 'libs/';

    var scriptTags = document.getElementsByTagName('script');

    for (var i = 0; i < scriptTags.length; i++) {
        if (scriptTags[i].src.match(/dojobootstrap\.js$/i)) {
            libsPath = scriptTags[i].src.replace(/dojobootstrap\.js$/i, '../');
            break;
        }
    }

    return libsPath;
}

function getPath() {
    if (document.location.pathname.substr(document.location.pathname.length - 1) == '/') {
        return document.location.pathname;
    }

    return document.location.pathname.substr(0, document.location.pathname.lastIndexOf('/'));
}

function loadDojo(loadApplication, error, authCheckOnly) {
	var xmlHttp = new XMLHttpRequest();

	xmlHttp.onreadystatechange = function () {
	    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
	        var data;

	        // Depending on the browser, a redirect to the login page may return status 200 with the HTML of the login
	        // page in responseText when called via xmlHTTP
	        if (/\<html/i.test(xmlHttp.responseText)) {
	            window.location.href = getPath() + 'Login.htm?ReturnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
	            return;
	        };

	        try {
	            if (JSON && JSON.parse) {
	                data = JSON.parse(xmlHttp.responseText);
	            }
	            else {
	                eval("var data = " + xmlHttp.responseText + ";");
	            }
	        }
	        catch (ex) {
	            //not valid JSON response - probably redirected HTML, just bail
	            return error(ex);
	        }

	        if (!data.result) {
				error();
			}

	        else if (data.result.status == "OK") {
	            if (!authCheckOnly) {
	                dojoConfig.locale = data.result.culture.toLowerCase();

	                var script = document.createElement('script');
	                script.type = 'text/javascript';
	                script.onload = loadApplication;

	                script.src = getLibsPath() + 'dojo/dojo.js';
	                document.getElementsByTagName('head')[0].appendChild(script);
	            }

	            else {
	                loadApplication();
	            }
	        }

			else if (data.result.redirect) {
			    window.location.href = data.result.redirect + '?ReturnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
			}

			else {
				error(data.message);
			}
		}

		else if (xmlHttp.readyState == 4) {
		    window.location.href = getPath() + 'Login.htm?ReturnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
		}
	}

	var origQuery = query = window.location.search.substring(1); //included to handle userid+password passed on the query string
	xmlHttp.open("GET", "ws.aspx/Quippe/Security/AuthCheck?DataFormat=JSON&Nonce=" + Math.random() + "&Path=" + encodeURIComponent(window.location.pathname) + (origQuery ? '&' + origQuery : ''), true);
	xmlHttp.send();
}