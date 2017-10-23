var gravatar = require('gravatar'),
    uniqid = require('uniqid'),
    gravatars = {},
    messages = [],
    clients = [];

var addMessage = function(data, res){
    var newMsg = { name: data.name, email: data.email, message: unescape(data.message), id: messages.length, timestamp: data.timestamp };

    for(let n in newMsg) if(typeof(newMsg[n]) == 'undefined' && typeof(res) != 'undefined') { res.statusCode = 405; return res.end(); }

    messages.push({
        gravatar: (data.email == 'anonymous@babble.com') ? null : gravatars[data.email],
        name: data.name,
        email: data.email,
        message: unescape(data.message),
        id: uniqid(data.name + '-'),
        timestamp: data.timestamp
    });

    if(typeof(res) == 'undefined') return messages[messages.length - 1].id;
    else{
        while(clients.length > 0) {
            var client = clients.pop();
            client.end(JSON.stringify( {count: messages.length, append: [messages[messages.length - 1]] }));
        }
        res.end();
    }
};

var getMessages = function(count, res){
    if(typeof(res) == 'undefined'){
        var retMsg = [], sliced = messages.slice(count);
        for(let s in sliced) retMsg.push({message: sliced[s].message});
        return retMsg;
    }
    else{
        if(messages.length > count) res.end(JSON.stringify( { count: messages.length, append: messages.slice(count) }));
        else clients.push(res);
    }
};

var register = function(postData, res){
    if(typeof(postData.email) == 'undefined') {
        res.statusCode = 400;
        return res.end();
    }
    gravatars[postData.email] = gravatar.url(postData.email, {s: '100', d:'identicon'}).split('www.')[1];
    res.end(JSON.stringify({gravatar: gravatars[postData.email]}));
};

var deleteMessage = function(id, res){
    if(typeof(res) == 'undefined'){
        messages = messages.filter(function(item) {
            return item.id !== id
        });
    }
    else{
        messages.push({ remove: id });
        while(clients.length > 0) {
            var client = clients.pop();
            client.end(JSON.stringify( {count: messages.length, append: [messages[messages.length - 1]] }));
        }
        res.end('true');
    }
};

var getStats = function(res){
    let messageCount = 0;
    for(let m in messages) messageCount += (typeof(messages[m].remove) == 'undefined' ? 1 : (-1));
    if(typeof(res) != 'undefined')  res.end(JSON.stringify( { users: clients.length, messages: messageCount }));
    else return JSON.stringify( { users: clients.length, messages: messageCount });
};

module.exports  = {
    register: register,
    getStats: getStats,
    deleteMessage: deleteMessage,
    addMessage: addMessage,
    getMessages: getMessages
};