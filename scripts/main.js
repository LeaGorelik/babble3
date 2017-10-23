Storage.prototype.setObject = function(key, value) {
    var obj = localStorage.getObject(key) == null ? {} : localStorage.getObject(key);
    for(var v in value) obj[v] = value[v];
    this.setItem(key, JSON.stringify(obj));
};

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

document.querySelector('.Form-message-submit').addEventListener('click', function(e){
    Babble.postMessage(document.querySelector('.Form-message-textarea').value);
});

document.querySelector('.Register-form-anon').addEventListener('click', function(e){
    Babble.register({ name: 'Anonymous', email: 'anonymous@babble.com'});
});

document.querySelector('.Form-message-textarea').addEventListener('keypress', function(e){
  if(e.keyCode == 13){
      Babble.postMessage(document.querySelector('.Form-message-textarea').value);
      document.querySelector('.Form-message-textarea').value = '';
  }
});

document.querySelector('.Register-form-save').addEventListener('click', function(e){
    var fullname = document.querySelector('.Register-form-fullname'), email = document.querySelector('.Register-form-email');
    if(fullname.validity.valid && email.validity.valid) Babble.register({ name: fullname.value, email: email.value });
});

var Babble = {
    counter: 0,
    remMsgShowHide: function(action, elem){
        var gotRemButton = elem.querySelector('.Main-chatList-li-remove');
        if(gotRemButton != null) gotRemButton.style.display = (action == 'show') ? 'block' : 'none';
    },
    register: function(_userInfo){
        localStorage.setObject('babble', {userInfo: _userInfo });
        Babble.request('/register', 'POST', JSON.stringify(_userInfo), function(response) {
            document.querySelector('.Register').style.display = 'none';
        });
    },
    getMessages: function(counter, callback){
        var chatListAppend = '', chatList = document.querySelector('.Main-chatList'), curDate, isMe, isRemove, remLi, tabCounter = 1;
        Babble.request('/messages?counter = ' + Babble.counter, 'GET', null, function(response) {
            if(typeof(response.count) != 'undefined') Babble.counter = response.count;
            else if(!isNaN(counter)) Babble.counter = counter;
            if(typeof(response.append) != 'undefined' && response.append.length > 0) {
                for(let a in response.append){
                    isMe = (localStorage.getObject('babble').userInfo.name == response.append[a].name &&
                        localStorage.getObject('babble').userInfo.email == response.append[a].email &&
                        unescape(response.append[a].message) == localStorage.getObject('babble').currentMessage);

                    isRemove = typeof(response.append[a].remove) != 'undefined';
                    if(!isRemove){
                        curDate = new Date(response.append[a].timestamp).toLocaleTimeString().split(' ')[0];
                        chatListAppend += '<li onfocus="Babble.remMsgShowHide(\'show\',this)" onmouseover="Babble.remMsgShowHide(\'show\',this)" ' +
                                ' onblur="Babble.remMsgShowHide(\'hide\',this)" onmouseout="Babble.remMsgShowHide(\'hide\',this)" ' +
                                'data-msg-id="' + response.append[a].id.replace(/ /g, '+').trim() + '" class="Main-chatList-li ' + (isMe ? 'isMe' : '') + '">' +
                                    '<img alt="" class="Main-chatList-li-gravatar" src="'+
                                     (response.append[a].gravatar == null ? 'images/anon.png' : ('http://' + response.append[a].gravatar)) + '">' +
                                    '<span class="Main-chatList-li-header">' +
                                        '<cite class="Main-chatList-li-cite">' + response.append[a].name + '</cite>' +
                                        '<time class="Main-chatList-li-time" datetime="' + curDate+ '">' + curDate + '</time>' +
                                    '</span>' +
                                    '<p class="Main-chatList-li-msg">' + unescape(response.append[a].message);
                        if(isMe) chatListAppend += '<button onclick="Babble.deleteMessage(\'' + response.append[a].id.replace(/ /g, '+').trim() + '\');" class="Main-chatList-li-remove" aria-label="Delete"></button>';
                        chatListAppend +='</p></li>';
                    }
                    else{
                        chatList.innerHTML += chatListAppend;
                        chatListAppend = '';
                        remLi = document.querySelector('li[data-msg-id="' + response.append[a].remove.replace(/ /g, '+').trim() + '"]');
                        if(remLi != null) remLi.classList.add('removed');
                    }
                }
                chatList.innerHTML += chatListAppend;
                for(let c in chatList.childNodes){ if(chatList.childNodes.hasOwnProperty(c)){
                    if(!chatList.childNodes[c].classList.contains('removed')){
                        chatList.childNodes[c].setAttribute('tabindex', tabCounter);
                        tabCounter++;
                        if(chatList.childNodes[c].classList.contains('isMe')){
                            chatList.childNodes[c].querySelector('.Main-chatList-li-remove').setAttribute('tabindex', tabCounter);
                            tabCounter++;
                        }
                    }
                }}
                if(!isRemove) localStorage.setObject('babble', {currentMessage: response.append[response.append.length - 1].message});
            }
            chatList.scrollTop = chatList.scrollHeight;
            if(typeof(callback) == 'function') callback(response);
            Babble.getMessages();
        });
    },
    postMessage: function(msg, callback){
        var localData = localStorage.getObject('babble'),
            isMsgObj = typeof(msg) == 'object',
            textAreaElem = document.querySelector('.Form-message-textarea'),
            data = {
                name: isMsgObj ? msg.name : localData.userInfo.name,
                email: isMsgObj ? msg.email : localData.userInfo.email,
                message: isMsgObj ? msg.message : escape(msg),
                timestamp: new Date().getTime()
            };

        localStorage.setObject('babble', {currentMessage: textAreaElem.value});

        Babble.request('/messages', 'POST', JSON.stringify(data), function(response) {
            if(msg == textAreaElem.value) textAreaElem.value = '';
            if(typeof(callback) == 'function') callback(response);
        });

        return false;
    },
    deleteMessage:function(_id, callback){
        Babble.request('/messages/' + _id, 'DELETE', JSON.stringify({id: _id}), function(response) {
            if(typeof(callback) == 'function') callback(true);
        });
    },
    getStats: function(callback){
        Babble.request('/stats', 'GET', null, function(response) {
            if(typeof(callback) == 'function') callback(response);
            else{
                document.querySelector('.Main-stats-clients').innerHTML = response.users;
                document.querySelector('.Main-stats-messages').innerHTML = response.messages;
                setTimeout(Babble.getStats, 3000);
            }
        });
    },
    request: function(url, method, data, cb){
        var request = new XMLHttpRequest(),
        _url = 'http://localhost:9000' + url.replace(/ /g, '');
        request.open(method, _url, true);
        console.log(method, _url);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                if(typeof(cb) == 'function'){
                    try{ cb(JSON.parse(request.responseText)); }
                    catch(err){  cb(request.responseText); }
                }
            }
            else console.log('error : ', url, request.responseText);
        };
        request.onerror = function(err) { console.log('error', err); };
        request.send(data);
    }
};

localStorage.setObject('babble', {currentMessage: '', userInfo:{ name: '', email: ''} });

Babble.getStats();
Babble.getMessages();