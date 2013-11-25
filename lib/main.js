const widgets = require("sdk/widget");
const panels = require("sdk/panel");
const tabs = require("sdk/tabs");
trelloTab = null;

var trelloPanel = panels.Panel({
    width:500,
    height:500,
    contentURL: "https://trello.com/1/authorize?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&name=Trello Notifications For Firefox&expiration=never&response_type=token&scope=read"
});

var mainWidget = widgets.Widget({
    id: "mozilla-icon",
    label: "My Mozilla Widget",
    contentURL: "http://www.mozilla.org/favicon.ico",
    onClick: function(){
        if (trelloTab == null){
            tabs.open("https://trello.com/1/authorize?key=38ba0bfcbfd56fee386c3dc0c9a0f4df&name=Trello Notifications For Firefox&expiration=never&response_type=token&scope=read");
            trelloTab = tabs.Tab({
                id: tabs.activeTab.id
            });
        }
        else{
            console.log(trelloTab.title);
            trelloTab.activate;
        }
    }
});
