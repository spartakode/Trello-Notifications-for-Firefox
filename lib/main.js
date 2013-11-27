const widgets = require("sdk/widget");
const panels = require("sdk/panel");
const tabs = require("sdk/tabs");
const ss = require("sdk/simple-storage");
const timers = require("sdk/timers");
const notifications = require("sdk/notifications");
const Requests = require("sdk/request");

trelloid = null;

var trelloPanel = panels.Panel({
    width:500,
    height:500,
    contentURL: "https://trello.com/1/authorize?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&name=Trello Notifications For Firefox&expiration=never&response_type=token&scope=read&write"
});

var mainWidget = widgets.Widget({
    id: "mozilla-icon",
    label: "My Mozilla Widget",
    contentURL: "http://www.mozilla.org/favicon.ico",
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
    }
}
var deleteWidget = widgets.Widget({
    id:"delete-widget",
    label:"Delete Token",
    content: "Delete",
    width: 100,
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
                //look! we got a notification
                ss.storage.sinceNotificationID = response.json[0].id;
                notifications.notify({
                    title: "New Trello Notification",
                    text: "You have "+ response.json.length + " new notification(s)"
                });
            }
        }
    });    
    notificationRequest.get();
}
