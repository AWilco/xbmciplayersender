var xbmciplayersender_gmCompiler={
log: function(txt)
{
sendAsyncMessage("XBMCSender:Dump", { 'text' : txt  });
},
   
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

contentLoaded: function(e)
{
    var unsafeWin=content;
    if (unsafeWin.wrappedJSObject) unsafeWin=unsafeWin.wrappedJSObject;

    var unsafeLoc=new XPCNativeWrapper(unsafeWin, "location").location;
    var href=new XPCNativeWrapper(unsafeLoc, "href").href;

    if (
        xbmciplayersender_gmCompiler.isGreasemonkeyable(href)
        && true
        && true
        /* check for bbc iPLayer website */
    ) {
        var match = /bbc\.co\.uk\/.*iplayer\//.exec(href);
        
        if (match)
        {
            sendAsyncMessage("XBMCSender:Dump", { text : 'Is iPlayer' });
           var script=xbmciplayersender_gmCompiler.getUrlContents(
             'chrome://xbmciplayersender/content/xbmciplayersender.js'
           );
           xbmciplayersender_gmCompiler.injectScript(script, href, unsafeWin);
       }
       
    }
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
injectScript: function(script, url, unsafeContentWin) {

    
    var sandbox, script, logger, storage, xmlhttpRequester;
    var safeWin=new XPCNativeWrapper(unsafeContentWin);

    sandbox=new Components.utils.Sandbox(safeWin);

    var storage=new xbmciplayersender_ScriptStorage();
    xmlhttpRequester=new xbmciplayersender_xmlhttpRequester(
        unsafeContentWin, content//appSvc.hiddenDOMWindow
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
    //sandbox.GM_openInTab=xbmciplayersender_gmCompiler.hitch(this, "openInTab", unsafeContentWin);
    sandbox.GM_xmlhttpRequest=xbmciplayersender_gmCompiler.hitch(
        xmlhttpRequester, "contentStartRequest"
    );
    //unsupported
    sandbox.GM_registerMenuCommand=function(){};
    sandbox.GM_log=xbmciplayersender_gmCompiler.hitch(xbmciplayersender_gmCompiler,"log");
    sandbox.GM_getResourceURL=function(){};
    sandbox.GM_getResourceText=function(){};
    sandbox.GM_openInTab=function(){};

    sandbox.__proto__=sandbox.window;

    try {
    
         this.evalInSandbox(
             "(function(){"+script+"})()",
             url,
             sandbox);
    } catch (e) {
        var e2=new Error(typeof e=="string" ? e : e.message);
        e2.fileName=script.filename;
        e2.lineNumber=0;
        //GM_logError(e2);
        content.alert(e2);
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
}//object xbmciplayersender_gmCompiler


function xbmciplayersender_ScriptStorage() {
    this.prefMan=new xbmciplayersender_PrefManager();
}
xbmciplayersender_ScriptStorage.prototype.setValue = function(name, val) {
    this.prefMan.setValue(name, val);
}
xbmciplayersender_ScriptStorage.prototype.getValue = function(name, defVal) {
    return this.prefMan.getValue(name, defVal);
}


sendAsyncMessage("XBMCSender:Dump", { text : 'In Content Process' });
addEventListener("DOMContentLoaded", xbmciplayersender_gmCompiler.contentLoaded, false);
