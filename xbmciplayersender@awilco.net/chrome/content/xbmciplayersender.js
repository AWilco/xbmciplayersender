// ==UserScript==
// @name          XBMC iPlayer sender
// @namespace     xbmciPlayer
// @description	  Provides an option on iPlayer to send to XBMC requires the URL of your XBMC box from the computer you install the script on
// @version January 2011.  Initial version
// @match bbc.co.uk/iplayer/*
// ==/UserScript==


var match = /iplayer\/episode\/([^\/#?]+)/.exec(window.location.href)
var enabled = GM_getValue('enabled');
if (enabled)
{
    if (match)
    {
        //With thanks to webtoolkit 
        // http://www.webtoolkit.info/javascript-base64.html
        var Base64 = {
 
            // private property
            _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
         
            // public method for encoding
            encode : function (input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;
         
                input = Base64._utf8_encode(input);
         
                while (i < input.length) {
         
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
         
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
         
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }
         
                    output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
         
                }
         
                return output;
            },
         
            // private method for UTF-8 encoding
            _utf8_encode : function (string) {
                string = string.replace(/\r\n/g,"\n");
                var utftext = "";
         
                for (var n = 0; n < string.length; n++) {
         
                    var c = string.charCodeAt(n);
         
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
         
                }
         
                return utftext;
            },
         
        }

        function sendRequest()
        {
        var host = GM_getValue('hostname');
        var port = GM_getValue('port');
        var username = GM_getValue('username');
        var password = GM_getValue('password');
        url = 'http://';
        url = url + host + ':' + port.toString() + '/jsonrpc';
        GM_log(url);
        
        if (username != "")
        {
            //Create authorization header
            var tok = username + ':' + password;
            var hash = Base64.encode(tok);
            var authHeader = "Basic " + hash;
        }
        
        var postData = '{"jsonrpc":"2.0","method":"XBMC.Play","params":"plugin://plugin.video.iplayer/?pid=' + match[1] + '","id":1}';
            try
            {
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                data: postData,
                headers: { Authorization: authHeader },
                onerror: function(r) {
                    GM_log('XBMC: Request Sent');
                    if (r.status != 200)
                    {
                        alert('Error Contacting XBMC ' + r.Status);
                    }
                }
                });
            }
            catch(err)
            {
                alert('Error Contacting XBMC ' + err);
            }
        }

        //add button
        var epTools = document.getElementById('episodeTools');
        
        //insert before epTools
        if (epTools)
        {
            GM_log('Adding desktop button');
            var div = document.createElement('div');
            var link = document.createElement('a');
            var img = document.createElement('img');
            img.src = "http://www.awilco.net/xbmc/main_btn.png";
            link.href="#";
            link.addEventListener('click',sendRequest,false);
            link.appendChild(img);
            div.appendChild(link);
            epTools.parentNode.insertBefore(div,epTools);
        }
        
        //Try mobile
        var mobileButton = document.getElementById('clicktoplay');
        if (mobileButton)
        {
            var btnImg = mobileButton.childNodes[1];
            GM_log(btnImg.nodeName);
            btnImg.src = "http://www.awilco.net/xbmc/send_to_xbmc.png";
            GM_log('Adding mobile button');
            mobileButton.addEventListener('click',sendRequest,false);
            
        }
    }
}