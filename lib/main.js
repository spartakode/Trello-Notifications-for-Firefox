const widgets = require("sdk/widget");
const panels = require("sdk/panel");
const tabs = require("sdk/tabs");
const ss = require("sdk/simple-storage");
const timers = require("sdk/timers");
const notifications = require("sdk/notifications");
const Requests = require("sdk/request");
var notificationsArray = new Array();

trelloid = null;

var trelloPanel = panels.Panel({
    width:500,
    height:500,
    contentURL: "https://trello.com/1/authorize?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&name=Trello Notifications For Firefox&expiration=never&response_type=token&scope=read&write"
});

var mainWidget = widgets.Widget({
    id: "trello-notifications",
    label: "Trello Desktop Notifications",
    contentURL: "http://www.google.com/s2/favicons?domain=trello.com",
    contentScript: callNotifications(),                    
    onClick: function(){
        //if condition to check if the token Value has been obtained before. The else section of this will in the future take us to an html page that lets the user log out and manage other settings.
        if(!ss.storage.tokenValue){
            //if condition to figure out which tab the app should shift to if the user clicks the icon. This is quite possibly a redundant thing and I might get rid of it soon.
            if (trelloid == null){
                tabs.open("https://trello.com/1/authorize?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&name=Trello Notifications For Firefox&expiration=never&response_type=token&scope=read,write");
                trelloid = tabs.activeTab.id;
                tabs.activeTab.on("ready", logURL);  
            }
            else{
                console.log(trelloid);
                if (tabs.activeTab.id == trelloid){
                    console.log("active");
                }
            }
            
        }
        else{
            console.log(ss.storage.tokenValue);            
            //timers.setInterval(checkNotifications,5000);
            //checkNotifications();
        }

    }
});

function callNotifications(){
    if (ss.storage.tokenValue){ 
        timers.setInterval(checkNotifications,5000); 
        timers.setInterval(doNotifications, 5000);
    }   
}
var deleteWidget = widgets.Widget({
    id:"delete-trello-token-widget",
    label:"Disconnect Trello Notifications for Desktop",
    content: "Disconnect Trello",
    width: 110,
    onClick: function(){
        if(ss.storage.tokenValue){            
            delete ss.storage.tokenValue;
        }
    }
});

//function to check if the tab we are tracking gets to the approve stage and then store the token in the simple storage
function logURL(tab){
    if(tab.url == ("https://trello.com/1/token/approve")){
        console.log("getting value");
        tab.attach({
            contentScript:"self.postMessage(document.getElementsByTagName('pre')[0].innerHTML);",
            onMessage: function(tokenValue){
                ss.storage.tokenValue = tokenValue.trim();
                ss.storage.sinceNotificationID = "";                
                callNotifications();
            }
        });
        tab.close();
    }    
}

function checkNotifications(){
    if(ss.storage.tokenValue){
        console.log(ss.storage.tokenValue);

        /*so since apparently I can't clear all notifications, I'm going to leave this code block in here and hope that at some point the trello guys fix this in
         * their api. Till then, on to the next solution. Check how many notifications since the last check and then make them into notifications
         * 
        var notifications = Requests.Request({
            url: "https://trello.com/1/notifications/all/read?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&token="+ss.storage.tokenValue,
            onComplete: function(response){
                console.log("https://trello.com/1/notifications/all/read?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&token="+ss.storage.tokenValue);
                console.log(response.text);
            }
        });
        notifications.post();*/

        var notificationRequest = Requests.Request({
            url: "https://api.trello.com/1/members/me/notifications/?since="+ss.storage.sinceNotificationID+"&read_filter=unread&key=38ba0bfcbfd56fee386c3dc0c9a0f4df&token="+ss.storage.tokenValue,
            onComplete: function(response){
                notifications.notificationCount = response.json.length;
                if (response.json.length > 0){
                    responseCount = response.json.length;
                    console.log(responseCount);
                    //look! we got a notification
                    ss.storage.sinceNotificationID = response.json[0].id;                
                    for (var i = responseCount; i >0; i--){
                        notificationsArray[notificationsArray.length] = response.json[i-1];
                    }
                }
            }
        });    
        notificationRequest.get();
    }
}

/*This is to get past what is either a bug or just a really poor implementation of notifications. 
 */
function doNotifications(){
    if(notificationsArray.length > 0){
        notifications.notify({
            title: constructTitle(notificationsArray[0]),
            text: constructMessage(notificationsArray[0])
        });
    }
    notificationsArray.splice(0,1);
}

function constructTitle(jsonCode){
    return jsonCode.memberCreator.fullName;
}
function constructMessage(jsonCode){
    if(jsonCode.type == "changeCard"){
        //console.log("changed card");
        if(jsonCode.data.old.idList){
            return "Moved " + jsonCode.data.card.name + " from " + jsonCode.data.listBefore.name + " to " + jsonCode.data.listAfter.name + " on " + jsonCode.data.board.name;
        }
        else if(jsonCode.data.old.desc){
            return "Updated the description of the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
        else if(jsonCode.data.old.name){
            return "Renamed the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
    }
    else if(jsonCode.type == "addedMemberToCard"){
        if(jsonCode.data.member.id == jsonCode.memberCreator.id){ //if the member is the same we need to have a slightly different message
            return "Joined the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
        else{
            return "Added " + jsonCode.member.name + " to the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
    }
    else if(jsonCode.type == "removedMemberFromCard"){
        if(jsonCode.data.member.id == jsonCode.memberCreator.id){ //if the member is the same we need to have a slightly different message
            return "Left the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
        else{
            return "Removed " + jsonCode.member.name + " from the card " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
        }
    }
    else if(jsonCode.type == "addedAttachmentToCard"){
        return "Attached " + jsonCode.data.attachment.name + " to " + jsonCode.data.card.name + " on " + jsonCode.data.board.name;
    }

    //console.log("final return");
    return "You have a new notification";
    
}
