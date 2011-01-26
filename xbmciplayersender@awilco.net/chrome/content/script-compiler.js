var xbmciplayersender_gmCompiler={

// getUrlContents adapted from Greasemonkey Compiler
// http://www.letitblog.com/code/python/greasemonkey.py.txt
// used under GPL permission
//
// most everything else below based heavily off of Greasemonkey
// http://greasemonkey.devjavu.com/
// used under GPL permission

onMessage: function(message) {
    dump(message.json.text);
},
onLoad: function() {
    dump(window.messageManager);
    window.messageManager.addMessageListener("XBMCSender:Dump", xbmciplayersender_gmCompiler.onMessage);
    window.messageManager.loadFrameScript("chrome://xbmciplayersender/content/prefman.js", true);
    window.messageManager.loadFrameScript("chrome://xbmciplayersender/content/xmlhttprequester.js", true);
    window.messageManager.loadFrameScript("chrome://xbmciplayersender/content/content.js", true);

    dump('End onLoad');
},

onUnLoad: function() {
    dump('Remove Listeners');
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