var xbmciplayersender_gmCompiler={

// getUrlContents adapted from Greasemonkey Compiler
// http://www.letitblog.com/code/python/greasemonkey.py.txt
// used under GPL permission
//
// most everything else below based heavily off of Greasemonkey
// http://greasemonkey.devjavu.com/
// used under GPL permission

    
    
getUrlContents: function(aUrl){
    var    ioService=Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
    var    scriptableStream=Components
        .classes["@mozilla.org/scriptableinputstream;1"]
        .getService(Components.interfaces.nsIScriptableInputStream);
    var unicodeConverter=Components
        .classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    unicodeConverter.charset="UTF-8";

    var    channel=ioService.newChannel(aUrl, null, null);
    var    input=channel.open();
    scriptableStream.init(input);
    var    str=scriptableStream.read(input.available());
    scriptableStream.close();
    input.close();

    try {
        return unicodeConverter.ConvertToUnicode(str);
    } catch (e) {
        return str;
    }
},

isGreasemonkeyable: function(url) {
    var scheme=Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService)
        .extractScheme(url);
        dump(scheme);
    return (
        (scheme == "http" || scheme == "https" || scheme == "file") &&
        !/hiddenWindow\.html$/.test(url)
    );
},

contentLoad: function(e) {
    dump('In contentLoaded');
    
// dump(Browser.selectedBrowser.contentDocument.title);
    // var unsafeWin=e.target.defaultView;
    // if (unsafeWin.wrappedJSObject) unsafeWin=unsafeWin.wrappedJSObject;

    // var unsafeLoc=new XPCNativeWrapper(unsafeWin, "location").location;
    // var href=new XPCNativeWrapper(unsafeLoc, "href").href;

    // if (
        // xbmciplayersender_gmCompiler.isGreasemonkeyable(href)
        // && true
        // && true
    // ) {
        
        // dump('Is greasmonkeyable');
        // var script=xbmciplayersender_gmCompiler.getUrlContents(
            // 'chrome://xbmciplayersender/content/xbmciplayersender.js'
        // );
        // xbmciplayersender_gmCompiler.injectScript(script, href, unsafeWin);
    // }
    
    // dump('end ContentLoaded');
},

injectScript: function(script, url, unsafeContentWin) {

    dump('In injectScript');
    var sandbox, script, logger, storage, xmlhttpRequester;
    var safeWin=new XPCNativeWrapper(unsafeContentWin);

    sandbox=new Components.utils.Sandbox(safeWin);

    var storage=new xbmciplayersender_ScriptStorage();
    xmlhttpRequester=new xbmciplayersender_xmlhttpRequester(
        unsafeContentWin, window//appSvc.hiddenDOMWindow
    );

    sandbox.window=safeWin;
    sandbox.document=sandbox.window.document;
    sandbox.unsafeWindow=unsafeContentWin;

    // patch missing properties on xpcnw
    sandbox.XPathResult=Components.interfaces.nsIDOMXPathResult;

    // add our own APIs
    sandbox.GM_addStyle=function(css) { xbmciplayersender_gmCompiler.addStyle(sandbox.document, css) };
    sandbox.GM_setValue=xbmciplayersender_gmCompiler.hitch(storage, "setValue");
    sandbox.GM_getValue=xbmciplayersender_gmCompiler.hitch(storage, "getValue");
    sandbox.GM_openInTab=xbmciplayersender_gmCompiler.hitch(this, "openInTab", unsafeContentWin);
    sandbox.GM_xmlhttpRequest=xbmciplayersender_gmCompiler.hitch(
        xmlhttpRequester, "contentStartRequest"
    );
    //unsupported
    sandbox.GM_registerMenuCommand=function(){};
    sandbox.GM_log=function(){};
    sandbox.GM_getResourceURL=function(){};
    sandbox.GM_getResourceText=function(){};

    sandbox.__proto__=sandbox.window;

    try {
    
        dump('Evaluating script');
        this.evalInSandbox(
            "(function(){"+script+"})()",
            url,
            sandbox);
    } catch (e) {
        var e2=new Error(typeof e=="string" ? e : e.message);
        e2.fileName=script.filename;
        e2.lineNumber=0;
        //GM_logError(e2);
        alert(e2);
    }
},

evalInSandbox: function(code, codebase, sandbox) {
    if (Components.utils && Components.utils.Sandbox) {
        // DP beta+
        Components.utils.evalInSandbox(code, sandbox);
    } else if (Components.utils && Components.utils.evalInSandbox) {
        // DP alphas
        Components.utils.evalInSandbox(code, codebase, sandbox);
    } else if (Sandbox) {
        // 1.0.x
        evalInSandbox(code, sandbox, codebase);
    } else {
        throw new Error("Could not create sandbox.");
    }
},

openInTab: function(unsafeContentWin, url) {
    var tabBrowser = getBrowser(), browser, isMyWindow = false;
    for (var i = 0; browser = tabBrowser.browsers[i]; i++)
        if (browser.contentWindow == unsafeContentWin) {
            isMyWindow = true;
            break;
        }
    if (!isMyWindow) return;
 
    var loadInBackground, sendReferrer, referrer = null;
    loadInBackground = tabBrowser.mPrefs.getBoolPref("browser.tabs.loadInBackground");
    sendReferrer = tabBrowser.mPrefs.getIntPref("network.http.sendRefererHeader");
    if (sendReferrer) {
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
        referrer = ios.newURI(content.document.location.href, null, null);
     }
     tabBrowser.loadOneTab(url, referrer, null, null, loadInBackground);
 },
 
 hitch: function(obj, meth) {
    var unsafeTop = new XPCNativeWrapper(unsafeContentWin, "top").top;

    for (var i = 0; i < this.browserWindows.length; i++) {
        this.browserWindows[i].openInTab(unsafeTop, url);
    }
},

apiLeakCheck: function(allowedCaller) {
    var stack=Components.stack;

    var leaked=false;
    do {
        if (2==stack.language) {
            if ('chrome'!=stack.filename.substr(0, 6) &&
                allowedCaller!=stack.filename 
            ) {
                leaked=true;
                break;
            }
        }

        stack=stack.caller;
    } while (stack);

    return leaked;
},

hitch: function(obj, meth) {
    if (!obj[meth]) {
        throw "method '" + meth + "' does not exist on object '" + obj + "'";
    }

    var hitchCaller=Components.stack.caller.filename;
    var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

    return function() {
        if (xbmciplayersender_gmCompiler.apiLeakCheck(hitchCaller)) {
            return;
        }
        
        // make a copy of staticArgs (don't modify it because it gets reused for
        // every invocation).
        var args = staticArgs.concat();

        // add all the new arguments
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        // invoke the original function with the correct this obj and the combined
        // list of static and dynamic arguments.
        return obj[meth].apply(obj, args);
    };
},

addStyle:function(doc, css) {
    var head, style;
    head = doc.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = doc.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
},
onMessage: function(message) {
    dump(message.json.text);
},
onLoad: function() {
    dump('In onLoad');
    var    appcontent=window.document.getElementById("browsers");
    //if (appcontent && !appcontent.greased_xbmciplayersender_gmCompiler) {
    //    appcontent.greased_xbmciplayersender_gmCompiler=true;
        appcontent.addEventListener("DOMContentLoaded", xbmciplayersender_gmCompiler.contentLoad, false);
        //appcontent.addEventListener("load", xbmciplayersender_gmCompiler.contentLoad, false);
        //appcontent.tabContainer.addEventListener("TabSelect", xbmciplayersender_gmCompiler.contentLoad, false);
    //}
    
    messageManager.addMessageListener("MyCode:Loaded", xbmciplayersender_gmCompiler.onMessage);

    messageManager.loadFrameScript("chrome://xbmciplayersender/content/content.js", true);

    dump('End onLoad');
},

onUnLoad: function() {
    dump('Remove Listeners');
    //remove now unnecessary listeners
    //window.removeEventListener('load', xbmciplayersender_gmCompiler.onLoad, false);
    //window.removeEventListener('unload', xbmciplayersender_gmCompiler.onUnLoad, false);
    //window.document.getElementById("browsers")
    //    .removeEventListener("DOMContentLoaded", xbmciplayersender_gmCompiler.contentLoad, false);
},

}; //object xbmciplayersender_gmCompiler

function dump(aMessage){
    var consoleService =
        Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("XBMC iPlayer: " + aMessage);
}
    

function xbmciplayersender_ScriptStorage() {
    this.prefMan=new xbmciplayersender_PrefManager();
}
xbmciplayersender_ScriptStorage.prototype.setValue = function(name, val) {
    this.prefMan.setValue(name, val);
}
xbmciplayersender_ScriptStorage.prototype.getValue = function(name, defVal) {
    return this.prefMan.getValue(name, defVal);
}


window.addEventListener('load', xbmciplayersender_gmCompiler.onLoad, false);
window.addEventListener('unload', xbmciplayersender_gmCompiler.onUnLoad, false);