define([
    "dijit/ColorPalette",
    "dijit/form/Select",
	"dojo/_base/Color",
    "dojo/_base/declare",
    "dojo/_base/json",
    "dojo/dnd/Moveable",
    "dojo/dnd/Source",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/parser",
	"dojo/request/iframe",
    "qc/_core",
	"dojo/domReady!"
], function (ColorPalette, Select, Color, declare, json, Moveable, Source, dom, domClass, domConstruct, on, parser, iframe, core) {
    return declare("Quippe.Barcode", [], {
        /* Barcode Capture Mode Initialization */
        InitializeBarcodeReader: function (nodeTarget) {
            document.liveCapturing = false;
            document.imgContent = "TESTING123";
            var persona = this;
    
            if (!nodeTarget)
                nodeTarget = document.documentElement;
    
            domConstruct.place(persona.GetBarcodeForm(), nodeTarget);
    
            videoObj = { "video": true };
            errBack = function (error) {
                console.log("Video capture error: ", error.code);
            };
    
            /* Create live preview window for video from camera */
            if (window.navigator.mozGetUserMedia) /* Firefox */
            { window.navigator.mozGetUserMedia(videoObj, function (stream) { persona.PlayVideo(stream); }, errBack); }
            else {
                if (navigator.webkitGetUserMedia)  /* WebKit (Chrome, Safari, Future Opera) */
                { navigator.webkitGetUserMedia(videoObj, function (stream) { persona.PlayVideo(window.webkitURL.createObjectURL(stream)); }, errBack); }
                else
                    if (navigator.getUserMedia) /* Generic - Opera, et al */
                    { navigator.getUserMedia(videoObj, function (stream) { persona.PlayVideo(stream); }, errBack); }
            }
    
            /* Hide live preview window for Safari and IE, which do not currently (Spring 2013) support it.  When support is available, comment this out */
            persona.SetBrowserDeviance();
    
            /* Attach click event to video preview to start/stop capturing, and to the file input changed event to capture files */
            persona.AttachCaptureEvents();
        },
    
        /* Show/hide the camera preview window and result value based on the browser type (part of Barcode Capture mode) */
        SetBrowserDeviance: function () {
    
            //this.SetErr(navigator.userAgent + ':::' + navigator.appName + ':::' + navigator.platform);
            if ((navigator.userAgent.indexOf('Safari') != -1 && (navigator.platform.indexOf('Mac') != -1 | navigator.platform.indexOf('iPad') != -1)) /* Safari */
    			|| navigator.appName.indexOf('Internet Explorer') != -1) /* IE */
            {
                document.getElementById("cameraPreview").style.display = "none";
                document.getElementById("cameraPreview").style.visibility = "collapse";
            }
            else {
                document.getElementById("safariValue").style.display = "none";
            }
        },
    
        /* Associate events with HTML elements for barcode capture */
        AttachCaptureEvents: function () {
            var persona = this;
            document.getElementById("capturedbarcode").onchange = function () { document.imgContent = undefined; persona.CaptureFrame(); setTimeout(function () { persona.LiveUpload(); }, 3000) };
            document.getElementById("video").onclick = function () { persona.ToggleCapture(); };
        },
    
        /* Stop displaying streaming video to user */
        StopVideo: function()
        {
            if (vElem = document.getElementById("video"))
                (window.navigator.mozGetUserMedia ? vElem.mozSrcObject : vElem.src).stop()
        },
    
        /* Associate camera video stream with the video HTML element and start it up */
        PlayVideo: function (streamSource) {
    
            var vElem = document.getElementById("video");
            vElem.src = streamSource;
    
            if (window.navigator.mozGetUserMedia) /* Firefox has to be different */
                vElem.mozSrcObject = streamSource;
    
            vElem.play();
            this.CaptureFrame(); /* This will cause the video and snapshot to appear */
        },
    
        /* Start/stop capturing images from the camera and examining them for barcodes */
        ToggleCapture: function () {
            if (!document.liveCapturing)
                this.EnableCapture();
            else
                this.DisableCapture();
        },
    
        /* Send captured (potential) barcode images to the server for analysis */
        EnableCapture: function () {
            var persona = this;
            persona.SetBarcodeValue("");
            document.imgContent = undefined;
            domConstruct.destroy(dom.byId("fileCap")); /* file inputs must be destroyed for reset if files are present as user files can't be removed */
    
            domConstruct.place('<div id="fileCap"><input id="capturedbarcode" type="file" accept="image/*" capture="camera" value="Take picture"></input><input id="safariValue" style="border:none"></input><div>', document.getElementById("barcodeForm"), "last");
            persona.SetBrowserDeviance(); /* Need to re-hide the Safari barcode ID we show */
            persona.AttachCaptureEvents();
    
            if (!document.liveCapturing) {
                document.liveCapturing = setInterval(function () {
                    if (document.getElementById("barcodeValue").innerHTML == "UNREADABLE" || document.getElementById("barcodeValue").innerHTML == "") {
                        //persona.CaptureFrame();
                        persona.LiveUpload();
                    }
                }, 1000);
            }
        },
    
        /* Stop sending potential barcode images to the server for analysis */
        DisableCapture: function () {
            if (document.liveCapturing) {
                clearInterval(document.liveCapturing);
                document.liveCapturing = false;
            }
        },
    
        /* Take a snapshot of the current video, or grab user specified file and save it to our host variable */
        CaptureFrame: function () {
            try {
                var persona = this;
    
                if (document.getElementById('capturedbarcode').files[0]) /* Safari Style */
                {
                    var reader = new FileReader();
    
                    reader.onload = (function (theFile) {
                        return function (e) { document.imgContent = e.target.result; };
                    })(document.getElementById('capturedbarcode').files[0]);
    
                    reader.readAsDataURL(document.getElementById('capturedbarcode').files[0]);
                }
                else {
                    document.getElementById("SnapshotPreview").getContext("2d").drawImage(document.getElementById("video"), 0, 0, 640, 480); /* Chrome, Firefox, Opera */
                    document.imgContent = document.getElementById("SnapshotPreview").toDataURL("image/png");
                }
                return document.imgContent;
            }
            catch (e)
    			{ ; }
        },
    
        /* Update the value of the barcode internally as well as displayed on the HTML form */
        SetBarcodeValue: function (data) {
            var newId = "";
            var changed = false;
    
            if (!(data.documentElement)) /* data contains string data only */
            {
                newId = data;
                changed = true;
            }
            else {
                if (data.documentElement.tagName != "Errors") /* data contains dom document with barcode info */{
                    newId = data.documentElement.getElementsByTagName("Item")[0].attributes.getNamedItem("BarcodeValue").value;
                    changed = true;
                }
            }
    
            document.getElementById("barcodeValue").innerHTML = newId;
            document.getElementById("safariValue").value = newId;
    
            if (changed) {
                document.getElementById("lastBarcodeValue").value = newId;
    
            }
            return changed;
        },
    
        /* Get the official barcode value */
        GetBarcodeValue: function () {
            return document.getElementById("barcodeValue").innerHTML;
        },
    
        /* Send an image as captured from the camera or file; to the server for analysis for barcode(s) */
        LiveUpload: function () {
            var persona = this;
            try {
	            iframe.send(core.serviceURL('Quippe/Barcode/Read?DataFormat=1'), {
		            method: "POST",
		            form: "barcodeForm",
		            contentType: "multipart/form-data",
		            data: {
			            barcodeData: persona.CaptureFrame(),
			            regexCheck: '^\\d+$',
			            barcodeType: 'CODE128,CODE39,EAN13' /* document.imgContent */
		            },
		            handleAs: "xml"
	            }).then(function(data, ioArgs) {
		            if (persona.SetBarcodeValue(data))
			            persona.DisableCapture();
	            }, function(message, io) {
		            persona.SetBarcodeValue("ERROR: " + message);
	            });
            } catch (e) { alert(e); }
        },
    
        /* Creates an HTML snippet containing a form with demonstration barcodes */
        GetBarcodeForm: function () {
    
            var formData = '<form id="barcodeForm"><div id="bcR">';
            formData += '<hidden id="lastBarcodeValue" style="display:none"></hidden>';
            formData += '<div id="barcodeInstruction" style="color:white;background-color:black;text-align:center;width:640px;font-family:Arial;">Capture barcode with camera or upload your local file (tap/click to begin):</div>';
            formData += '<div id="cameraPreview" style="position:relative">';
            formData += '<div style="width:640px;height:480px;display:inline-block">';
            formData += '<video id="video" style="position:absolute;top:0px;" width="640" height="480" autoplay="autoplay" preload="none" alt="Video Stream"></video>';
            formData += '<canvas id="SnapshotPreview" width="640" height="480" style="width:192px;height:144px;border-style:groove;border-width:medium;border-color:Black;position:absolute;top:0px;"></canvas><br />';
            formData += '</div><br /><div style="width:640px"><label id="barcodeValue" value="NONE" style="position:relative;float:right;top:-18px;z-index:100;font-family:courier;font-weight:bold;background-color:black;color:white"></label></div>';
            formData += '</div>';
            formData += '<div id="fileCap"><input id="capturedbarcode" type="file" accept="image/*" capture="camera" value="Take picture"></input><input id="safariValue" style="border:none"></input><div>';
            formData += '<input id="errs" class="bcHideableDemo" readonly style="border:none;color:red;width:100%"></input></div></form> ';
            return formData;
        },
    
    	/*Barcode Generate */
    	InitializeBarcodeGenerate: function()
    	{
    		var persona = this;
    		document.lastChange = new Date(); /* Tracks the last time we called the server to generate barcodes */
    		domConstruct.place(persona.CreateGenerateForm(), "body"); /* Dynamically creates our HTML form components from text*/
    		if (persona.cPal)
                persona.cPal.destroyRecursive();
            persona.cPal = new ColorPalette({palette: "7x10", style: "display:none", onChange: function(val){persona.SetColor(val);}}, "colorPal" );  /* Create a dojo dijit color palette and attach it to our form */
            persona.GetBarcodeTypes("specs", "bcSelect"); /* Queries the server for a list of valid barcode types we can generate */
    		persona.AttachGenerateEvents(); /* Associate events on form elements with appropriate actions */
    	},
    
        /* Given an RGB String such as '#f0f8ff', find the descriptive name for that combination, as provided by dojo */
    	ColorNameFromRGBString: function(val)
    	{
    		var cName = undefined;
    		var t = function(o, i, v, s, f) {return Color.named[o][i] != undefined && Color.named[o][i] == parseInt(v.substring(s,f),16)};
    		for (var oneColor in Color.named)
    			{if (cName = (t(oneColor, 0, val, 1,3) && t(oneColor,1, val, 3,5) && t(oneColor, 2, val, 5,7)) ? oneColor : cName) break;}
    
    		return cName;
    	},
    
        /* Changes the color of the barcode displayed on the form */
    	SetColor: function(val)
    	{
    		var persona = this;
    		dom.byId("colorPal").style.display = "none"; /* Hide the color palette */
    		var colButton = dom.byId("colorName"); /* Get color button for updating below */
    
    		/* Examine the val parameter, if not provided, use current color.  If no custom color ever specified, default to black */
    		val = val == undefined ? (colButton.customcolor == undefined ? "#000000" : colButton.customcolor) : val;
    		if (parseInt(val.substring(1,8),16) == 16777215) return; /* Background is white, do not make barcode white */
    
    		/* Change the button label to the color name, save the color value for later use */
    		colButton.customcolor = val;
    		colButton.value = 'Color: ' + persona.ColorNameFromRGBString(val);
    
    		/* Get the drawing context of our canvas and the image source */
    		var gCtx = dom.byId("canV").getContext("2d");
    		var img = dom.byId("barcodeWithLabel");
    		var iWidth=img.width > 0 ? img.width : gCtx.canvas.width, iHeight = img.height > 0 ? img.height : gCtx.canvas.height; /* IE can't seem to get the source image width, fall back to canvas size which should be identical */
    
    		/* Get the image data contained in the drawing context */
    		var imgd = gCtx.getImageData(0,0,iWidth,iHeight);
    		var pix = imgd.data;
    
    		/* Grab the RGB values from our input string.  e.g "#f0f8ff" Alice blue  */
    		var newRGB = [parseInt(val.substring(1, 3),16), parseInt(val.substring(3,5),16), parseInt(val.substring(5,7),16)]
    
    		/* Examine each pixel, which is 4 bytes - RGB and Alpha; making changes where appropriate */
    		for (var i = 0, n = pix.length; i < (n - (15 * 4 * iWidth)); i += 4) /* We are deliberately ignoring the label height of 15 pixels */
    		{
    			var lineStart = i == 0 || i % (4 * iWidth) == 0; /* Start of one horizontal line of pixels */
    			if ((pix[i] + pix[i+1] + pix[i+2]) != 765) /* skip color change if white/background (765) */
    				for (j =0; j < 3; j++)
    					pix[i+j] = newRGB[j]; /* Assign values to each pixel, 3 bytes. Fourth byte is alpha but we don't touch it */
    		}
    
    		/* Draw the barcode in its new color */
    		gCtx.clearRect(0, 0, iWidth, iHeight); /* Clear the canvas */
    		gCtx.putImageData(imgd, 0, 0); /* Update the barcode */
    	},
    
        /* Shows the color palette dijit so the user can select a new barcode color */
    	GetColor: function()
    	{
    		var persona = this;
            var cPalS = dom.byId("colorPal").style;
    		cPalS.display = "block";
    		cPalS["position"] = "fixed";
    		cPalS.left = dom.byId("colorName").offsetLeft + 'px';
    		cPalS.top = (dom.byId("colorName").offsetTop - dom.byId("colorPal").offsetHeight) + 'px';
    	},
    
        /* Query the server for a list of valid barcode types we can generate, add a dropdown list with them in it to the document */
        GetBarcodeTypes: function(targetNodeName, selectId)
    	{
            var persona = this;
            persona.DojoAjax('Quippe/Barcode/Manage?Method=barcodetypes', 'GET', 'xml', true,
            function (data, ioArgs)
    		{
                domConstruct.place("<label>Barcode Type: </label>" + persona.MakeSelectCommon(selectId, data, "item", function(oneItem) {var i = oneItem.attributes; return { value: i["value"].value, text: i["value"].value};}), targetNodeName, "first");
                dom.byId(selectId)[1].selected = "1"; /* Default to CODE128 */
    		});
    	},
    
        /* Calls Quippe to get a list of all known patients in the system, adds them to a SELECT input box */
        GetPatientList: function(targetNodeName, selectId)
        {
            var persona = this;
            persona.DojoAjax('Quippe/PatientData/Patients', 'GET', 'xml', true,
            function(data, ioArgs)
            {
                domConstruct.place("<label>Patient: </label>" + persona.MakeSelectCommon(selectId, data, "Patient", function(oneItem) {var i = oneItem.attributes; return {value: i["id"].value, text: i["LastName"].value + ', ' + i["FirstName"].value};}), targetNodeName, "first");
            });
        },
    
        /* Creates the text describing an HTML SELECT element given an Id and a set of name/value pairs */
        MakeSelectCommon: function(idName, srcData, tagName, itemFunc)
        {
            var selText = "<select id='" + idName + "' " + "data-dojo-type='digit.form.select'>";
            if (srcData.documentElement)
            {
                var nList = srcData.documentElement.getElementsByTagName(tagName);
                var x = 0;
                while (nList[x])
                {
                    var oneOpt = itemFunc(nList[x++]);
                    selText += "<option value='" + oneOpt.value + "'>" + oneOpt.text + "</option>";
                }
            }
            return selText + "</select>";
        },
    
        /* Requests a barcode creation from the server.  Data is returned in a base64 encoded string */
        GetBase64Barcode: function()
    	{
    		var persona = this;
            persona.DojoAjax('Quippe/Barcode/Generate?DataFormat=1&IncludeLabel=true&BarcodeData=' + document.getElementById("barcodeData").value + "&BarcodeType=" + document.getElementById("bcSelect").value +'&Height=' + dom.byId("height").value + '&Width=' + dom.byId("width").value, 'GET', 'xml', true,
            function (data, ioArgs)
            {
    	        if (data.getElementsByTagName('Item')[0].getAttribute('BarcodeImage')) /* Barcode created successfully */
    		        dom.byId("barcodeWithLabel").src = data.getElementsByTagName('Item')[0].getAttribute('BarcodeImage'); /* Assign returned text to image src */
    	        else
    		        persona.SetErr(data.getElementsByTagName('Item')[0].getAttribute('Error')); /* Error in barcode generation */
    
    	        /* Show/hide our barcode canvas depending on whether we have a valid barcode or not */
    	        dom.byId("canV").style.visibility = data.getElementsByTagName('Item')[0].getAttribute('BarcodeImage') ? "visible" : "hidden";
            });
    	},
    
    	/* Common function to display errors to the user */
        SetErr: function(eVal)
    	{
    		dom.byId("errs").value = eVal;
    	},
    
        /* Draws the barcode on a canvas element */
    	PaintCanvas: function ()
    	{
    		var persona = this;
    		var canvElem = dom.byId("canV") /* Get the canvas element itself for reference */
    		var gCtx = canvElem.getContext("2d"); /* Get the canvas' 2D drawing context */
    
    		canvElem.width = dom.byId("width").value; /* Set canvas height/width to the user specified values*/
    		canvElem.height = dom.byId("height").value;
    
    		gCtx.clearRect(0, 0, canvElem.width, canvElem.height); /* Clear the canvas */
    		gCtx.drawImage(document.getElementById("barcodeWithLabel"), 0, 0); /* Draw the barcode onto the canvas from the hidden element */
    		persona.SetColor(); /* Change the color of the barode and redraw it on the canvas, if the user has requested a color other than black */
    	},
    
        /* Determines whether a user change should invoke a server call to generate a barcode */
        QualifyingChange: function(dat)
        {
            var qualifies = false;
    
            /* Only attempt generate if the key pressed is a regular character; as we're getting all keyboard input sent here */
    		if (dat != undefined)
    		{
    			dat.between = function(s, e) {return this.keyCode >= s && this.keyCode<= e};
    			dat.contains = function() {for (aI =0; aI < arguments.length; aI++) if (this.keyCode == arguments[aI]) return true; return false;};
    			qualifies = ((dat.contains(13,8,46) || dat.between(48,90)) || (dat.between(96,111)) || (dat.between(186,222)));
            }
    
            /* If a user is actively entering characters, performing a barcode update on each change is wasteful.  We will wait for
    		five seconds before we regenerate, unless it's an "enter" - keycode 13; in which case we generate immediately */
            qualifies = qualifies & (dat && dat.keyCode == 13) | (( document.lastChange.valueOf() + 5000) <= new Date().valueOf());
    
            if (qualifies)
                document.lastChange = new Date();
    
            return qualifies;
        },
    
        /* Requests barcode generation from server when appropriate */
    	SmartGenerate: function(dat)
    	{
    		var persona = this;
    
            if (persona.QualifyingChange(dat))
    		{
    			persona.SetErr(""); /* Reset error notification */
    
    			try /* Perform a GET call to dynamically generate a barcode, which returns a .png */
    			{
    				dom.byId("basicBarcode").setAttribute("src", "~/ws.aspx/Quippe/Barcode/Generate?BarcodeData=" +
    				dom.byId("barcodeData").value + "&BarcodeType=" + dom.byId("bcSelect").value);
    			}
    			catch (e0) {persona.SetErr(e0);}
    
    			try /* Also perform GET call, but return the barcode in BASE64 encoded text for client side manipulation */
    			{	/* Note that we perform each call in independent try/catch blocks as one barcode generation may fail but not the other */
    				persona.GetBase64Barcode();
    			}
    			catch (e1) {persona.SetErr(e1);}
    		}
    		else
    			setTimeout(function() {persona.SmartGenerate()}, 1000);
    	},
    
        /* Creates the HTML form for the barcode generate mode */
    	CreateGenerateForm: function()
    	{
    		var formData = '<form id="barcodeGenerateForm" method="get"><div id="bcfContent" style="border-width:2px;border-color:black;border-style:inset">';
    		formData += '<TABLE width="100%"><TR><TD style="font-size:large;text-align:center;" colspan="2">Barcode Generation</TD></TR>';
    		formData += '<TR><TD style="color:blue;text-align:center">Basic Barcode</TD><TD style="color:blue;text-align:center">Barcode with label, custom size & color</TD>';
    		formData += '<TR><TD><div style="text-align:center"><img id="basicBarcode"></img></div></TD>';
    		formData += '<TD><div style="text-align:center"><canvas id="canV" style="text-align:center"></canvas></div></TD></TR></TABLE>';
    		formData += '<img id="barcodeWithLabel" style="display:none"></img>';
    		formData += '<p/><div id="specs"><input type="button" id="colorName" value="Set Color"></button><span id="colorPal">Color Palette</span><label>Data to Encode: </label><input id="barcodeData" value="012345"></input>';
    		formData += '<label>Width: </label><input id="width" style="width:5em" value="300"></input><label>Height: </label><input id="height" style="width:5em" value="150"></input></div>';
    		formData += '<input id="errs" readonly style="border:none;color:red;width:100%"></input></div></form>';
    		return formData;
    	},
    
    	/* Associate events related to barcode generate mode with their HTML elements */
        AttachGenerateEvents: function()
    	{
    		var persona = this;
    		if (dom.byId("bcSelect"))
    		{
    			dom.byId("barcodeData").onkeyup = dom.byId("height").onkeyup = dom.byId("width").onkeyup =
    				function(dat) { persona.SmartGenerate(dat);};
    
    			dom.byId("barcodeWithLabel").onload = function() {persona.PaintCanvas();};
    			dom.byId("bcSelect").onchange = function() { persona.SmartGenerate({keyCode: 13});};
    
    			dom.byId("colorName").onclick = function() { persona.GetColor(); };
    			persona.SmartGenerate({keyCode: 13}); /* Generate the initial two barcodes with the default values */
    		}
    		else /* HTML Form still inchoate, wait a bit and try again */
    			setTimeout(function () {persona.AttachGenerateEvents();}, 500);
    	},
    
        /* Startup wristband mode  */
        InitializeWristBandForm: function()
        {
            var persona = this;
    
            /* Initialize global storage for all allergy related medcin IDs, and for those which appear in a chart, per patient */
            if (persona.patientAllergies == undefined) persona.patientAllergies = {patients: []};
    
            /* Create the wristband from from an HTML snippet */
            domConstruct.place(persona.CreateWristbandForm(), "body", "last");
    
            /* Get a list of all patients to choose from to add to the barcode */
            persona.GetPatientList("customData", "patSelect");
    
            /* Get a list of barcode types to select from for the barcode */
            persona.GetBarcodeTypes("customData", "wbBcSelect");
    
            /* Associate allergy display and barcode generation activities with user changes */
            persona.AttachWristbandEvents();
    
            /* Establish the last time the data was updated */
            document.lastChange = new Date();
        },
    
        /* Creates an HTML form which demonstrates a sample wristband */
        CreateWristbandForm: function()
        {
    
            var formData = '<form id="wristbandForm"><div id="upperWhitespace" class="bcHideableDemo"><p/></div><div id="customData" class="bcHideableDemo"><label>Length (inches): </label><input id="wristbandLength" style="width:5em" value="11"/>';
            formData += '<label>Width (inches): </label><input id="wristbandWidth" style="width:5em" value="1"/></div><p/>';
            formData += '<div id="wristbandFloat" style="position:relative;border-width:3px;border-style:outset">';
            formData += '<span id="innerWrist" class="container" style="position:relative;xbackground-color:lightgray">';
            formData += '<span id="bcSpan0" style="display:inline-block;vertical-align:top;position:relative;height:100%;width:20%;margin-left:5px">Patient Id</span><span style="display:inline-block;vertical-align:top;position:relative;height:100%;width:35%"><img id="wristBarcode"></img></span><span id="bcSpan1" ></span><span id="bcSpan2" style="color:red;font-weight:bold;display: inline-block;vertical-align:top;position:relative;height:100%;width:40%" ></span></span></div>';
            formData += '</div><input id="errs" class="bcHideableDemo" readonly style="border:none;color:red;width:100%"></input></form>';
    
            return formData;
        },
    
        /* Updates the size and contents of the wristband */
        UpdateWristband: function(dat)
        {
            var persona = this;
    
            /* This contains the actual wristband content */
            var wb = dom.byId("innerWrist");
    
            /* The text values for the desired width and length.  NOTE: on the page, HEIGHT = WIDTH, or top to bottom.
            For the paper wristband, HEIGHT actually means the narrowest dimension of the paper (for two dimensional paper)*/
            var wbH = dom.byId("wristbandWidth").value;
            var wbL = dom.byId("wristbandLength").value;
    
            /* Set the outer container of the wristband to the values the user has provided */
            persona.PropSet(dom.byId("wristbandFloat"), [{t: "s", n: "width", v: wbL + "in"}, {t: "s", n: "height", v: wbH + "in"}]);
    
            /* Set the inner wristband to consume all available space within the outer container */
            persona.PropSet(wb, [{t: "g", n: "width", v: "100%"}, {t: "g", n: "height", v: "100%"}]);
    
            /* Calculate height of barcode as displayed.  Width is arbitrarily set to twice height.  Also leave 5% margin. */
            /* NOTE: Values are provided by the user in inches.  Multiply them by the screen dpi (96 on average )to get pixels */
            var hVal = parseInt(wbH * .9 * 96, 10);
            var wVal = parseInt(wbH * .9 * 96 * 2, 10);
    
            /* Get a reference to our container for the customer name/id/etc. */
            var bcs = dom.byId("bcSpan0");
    
            /* Clear out previous customer information */
            domConstruct.empty(bcs);
    
            /* Add the customer name and Identifier to the wristband */
            var ps = dom.byId("patSelect");
            domConstruct.place("<div>" + ps.value + "</div>", bcs, "last");
            domConstruct.place("<div>" + (ps.options[ps.selectedIndex].innerText ? ps.options[ps.selectedIndex].innerText : ps.options[ps.selectedIndex].text) + "</div>", bcs, "last");
    
            /* Check to see if the user has made a significant enough change (or enough time has passed) to warrant a call to make a new barcode and do an allergy check */
            if (persona.QualifyingChange(dat))
            {
                /* Assign the image to a newly generated URL, which will force the browser to fetch the new image, which will be dynamically generated by quippe and returned in a .png */
                persona.PropSet(dom.byId("wristBarcode"), [{t: "a", n: "height", v: hVal}, {t: "a", n: "width", v: wVal},
                    {t: "a", n: "src", v: "~/ws.aspx/Quippe/Barcode/Generate?BarcodeData=" + ps.value + "&BarcodeType=" + dom.byId("wbBcSelect").value + "&Height=150&Width=300"}]);
    
                /* Find all allergies for this patient and add them to the wristband */
                persona.GetAllergies(ps.value, ps.options[ps.selectedIndex].innerText);
            }
        },
    
        /* Associates HTML events with actions to update our patient, barcode, wristband size, etc. */
        AttachWristbandEvents: function()
        {
            var persona = this;
    
            if (dom.byId("patSelect") != undefined && dom.byId("wbBcSelect") != undefined)
                dom.byId("patSelect").onchange = dom.byId("wbBcSelect").onchange = dom.byId("wristbandWidth").onkeyup = dom.byId("wristbandLength").onkeyup = function(dat) {persona.UpdateWristband(dat.type="change" ? {keyCode: 13} : dat);};
            else
                 /* Wait a bit until our allow our host HTML elements are loaded and retry */
                setTimeout(function() {persona.AttachWristbandEvents();}, 500);
        },
    
        /* Removes commonly used but javascript identifier illegal characters from a patient Id (or any other string), and prepends an underscore to ensure first character validity */
        CleanPId: function(pId)
        {
            return ("_" + pId).replace(',', '').replace('.', '').replace(' ', '').replace("'", '').replace('`');
        },
    
        /* Given a patient identifier, call the server and search for his/her allergy history */
        GetAllergies: function(pId, pName)
        {
            var persona = this;
    
            /* Get all Allergy related data from the server by nodekey or prefix */
            if (persona.patientAllergies.patients[persona.CleanPId(pId)] == undefined)
                persona.DojoAjax("Quippe/PatientData/HistoryPool?PatientId=" + pId + "&NodekeyFilter=-B-L-N-L&PrefixFilter=AL,IN,HY&DataFormat=2", "GET", "xml", false, function(dat) {persona.RecordPatientAllergies(dat, pName); });
            else /* We already have allergy information.  Gather it up and display it on the wristband */
                persona.DisplayAllAllergies(pId);
        },
    
        /* Place all allergy information for a patient on the wristband */
        DisplayAllAllergies: function(pId)
        {
            var persona = this;
    
            /* Sanitize the patient ID for use as a javascript identifier */
            var cPId = persona.CleanPId(pId);
    
            /* Remove any previously displayed allergy information */
            domConstruct.empty(dom.byId("bcSpan2"));
    
            /* This patient has allergies.  Get them from our local storage and add them to the wristband */
            if (persona.patientAllergies.patients[cPId] != undefined && persona.patientAllergies.patients[cPId].allergies != undefined && persona.patientAllergies.patients[cPId].allergies.length > 0)
                for (var x = 0; x < persona.patientAllergies.patients[cPId].allergies.length; x++)
                    persona.DisplayAllergy({m: persona.patientAllergies.patients[cPId].allergies[x].m, cPTx: persona.patientAllergies.patients[cPId].allergies[x].cPTx, p: pId}, pId);
            /* Patient has no noted allergies.  Add a note to the wristband declaring such */
            else
                persona.DisplayAllergy({m: -1, p: pId, cPTx: "No recorded allergies"}, pId);
        },
    
        /* Called back from the server - save the allergy information to our local store and add the data to the wristband */
        RecordPatientAllergies: function(gcrDat, pName)
        {
            var persona = this, jsText = persona.GetJSON(gcrDat);
    
            if (jsText == undefined)
                return;
    
            var cpId = persona.CleanPId(jsText.historyPool.patientId);
    
            /* Create a new object to hold all allergy data for this patient */
            persona.patientAllergies.patients[cpId] = { patientId: jsText.historyPool.patientId, patientName: pName, allergies: []};
    
            if (jsText.historyPool.findings == undefined) /* Patient has no recorded allergies */
                persona.patientAllergies.patients[cpId].allergies.push({m: -1, p: jsText.historyPool.patientId, cPTx: "No recorded allergies"});
            else
                for (var x = 0; jsText.historyPool.findings != undefined && x < jsText.historyPool.findings.length; x++) /* Add allergy to our local store */
                    persona.patientAllergies.patients[cpId].allergies.push({m: jsText.historyPool.findings[x].medcinId, p: jsText.historyPool.patientId, cPTx: jsText.historyPool.findings[x].text});
    
            /* Add all allergies to the wristband */
            persona.DisplayAllAllergies(jsText.historyPool.patientId);
        },
    
        /* Adds an allergy to the HTML form */
        DisplayAllergy: function(dsDat, pId)
        {
            domConstruct.place("<div>" + dsDat.cPTx + "</div>", dom.byId("bcSpan2"), "last");
        },
    
        /* Extracts json text a returned value from the server (browser agnostic) */
        GetJSON: function(gjDat)
        {
            var fText = undefined;
            var iT = gjDat.documentElement.innerText, pT = gjDat.documentElement.getElementsByTagName("pre");
    
            if (iT != undefined)
                fText = iT;
    
            if (fText == undefined && pT != undefined && pT[0] != undefined && pT[0].innerHTML != undefined)
                fText = pT[0].innerHTML;
    
            return fText != undefined ? JSON.parse(fText) : fText;
        },
    
    
        /* Shows/Hides the HTML form data which supports each Barcode mode (0: Read, 1: Generate, 2: Wristband) */
        ChangeMode: function (val)
        {
            var persona = this;
    
            /* A list of the potential modes/forms and the initializer for each.  Their sequence order is used by the caller to specify which mode is requested */
            var modes = [{ fo: "barcodeForm", fu: function () { persona.InitializeBarcodeReader(); } }, { fo: "barcodeGenerateForm", fu: function () { persona.InitializeBarcodeGenerate(); } }, { fo: "wristbandForm", fu: function () { persona.InitializeWristBandForm(); } }]
    
            /* Next, destroy any/all of the three forms which exist; so we can start from scratch */
            modes.forEach(function (v) { domConstruct.destroy(dom.byId(v.fo)); });
    
            /* Stop any streaming video if present */
            persona.StopVideo();
    
            /* If we're capturing barcodes, shut that down */
            persona.DisableCapture();
    
            /* Color Pallete was added dynamically and needs to be separately destroyed */
            domConstruct.destroy(dom.byId("colorPal"));
    
            /* Call the initializatin function for the desired mode */
            modes[val].fu();
        },
    
        /* Sets one more more properties on a provided target object.  propVals is assumed to be an array of objects {t: type (a=attr,s=style,g=generic) n: nameOf property, v: newValue} */
    	PropSet: function(target, propVals)
        {
            for (var x = 0; x < propVals.length; x++)
                if (propVals[x].t == "a")
                    target.setAttribute(propVals[x].n, propVals[x].v);
                else
                    if (propVals[x].t == "s")
                        target.style[propVals[x].n] = propVals[x].v;
                    else
                        target[propVals[x].n] = propVals[x].v;
        },
    
        /* Convenience method to wrap the DOJO call functionality for commonly used values (GET, error, etc.) */
        DojoAjax: function(dUrl, dMethod, dhandleAs, dpreventCache, loadFunction)
        {
            var persona = this;
    		try {
			    iframe.send(core.serviceURL(dUrl), {
				    method: dMethod,
				    handleAs: dhandleAs,
				    preventCache: dpreventCache
			    }).then(loadFunction, function(message, io) {
				    persona.SetErr(message);
			    });
		    }
            catch (e) { persona.SetErr(e); }
        }
    
    });
});