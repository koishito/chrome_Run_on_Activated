// const curkey = String.fromCharCode(189);
const systemDataKey = `"System data : excluded URLs & Script template"`;


// Fires when the active tab in a window changes.
chrome.tabs.onActivated.addListener(function (activeInfo) {
  // console.log(activeInfo.tabId);
  onChangedActiveTab();
});

// Fired when a tab is closed.
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  // if (removeInfo.status == "complete" && tab.active) {
    onChangedActiveTab();
  // }
});

// Fired when a tab is updated.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "complete" && tab.active) {
    onChangedActiveTab();
  }
});

// 機能拡張のインストール・アップデート時に実行
chrome.runtime.onInstalled.addListener(function (details) {
  console.log("onInstalled: " + details.reason);
  // if (details.reason = 'install') {
    // chrome.storage.sync.clear();
  // }
  onChangedActiveTab();

});

// // 機能拡張の起動時に実行
// chrome.runtime.onStartup.addListener(function () {
//   console.log("onStartup");

// });

function onChangedActiveTab(){
  chrome.storage.sync.get(null, function(items) {
    var keys = Object.keys(items);
    // storageが空の場合に、jstextの初期値を設定
    if (keys.length === 0){
      initialLoad();
      onChangedActiveTab();
    } else {
      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        const tabId = tabs[0].id;
        const url = tabs[0].url;
        setIcon(``, `Unmatched` );
        // Check URL
        for (let i = 0 ; i < keys.length; i++) {
          var key = keys[i];
          var item = items[key];
          var regPattForURLArray = item.regPattForURL.split(/\r\n|\r|\n/)
          var matchedRegPatts = "";
          for (let j = 0; j < regPattForURLArray.length; j++) {
            var regPattForURL = regPattForURLArray[j];
            var matchedURL = url.match(RegExp(regPattForURL.substr( 1, regPattForURL.length - 2 )));
            console.log(url, matchedURL);
            if ((/\/.+\//.test(regPattForURL)) && (matchedURL)) {
              matchedRegPatts += '\n' + regPattForURL;
            }
          }
          item.match = (matchedRegPatts) ? `\n` + key + matchedRegPatts : ``;
        }
        // Processing based on the check result
        const excludedMatch = items[systemDataKey].match;
        if (excludedMatch) {
          setIcon(`excpt`, excludedMatch.slice(1));
        } else {
          var matchedRegPatts = "";
          for (let i = 0 ; i < keys.length; i++) {
            var key = keys[i];
            var item = items[key];
            var match = item.match;
            if ((key != systemDataKey) && (match)) {
              matchedRegPatts += match;
              var execScript = items[systemDataKey].script;
              var curregPattForURL = match.split(/\r\n|\r|\n/)[2]; //[0] is .[1] is name.
              execScript = execScript.replace(/\*\*regular expression pattern for url matching\*\*/, curregPattForURL);
              execScript = execScript.replace(/\*\*script\*\*/, item.script);
              // console.log(`execScript : ` + execScript);
              var response = executeScript(tabId, execScript);
            }
          }
          if (matchedRegPatts) {
            setIcon(`set`, matchedRegPatts.slice(1));
          }
        }
      });
    }
  });
}

function setIcon(badgeText, toolTip) {
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.setTitle({ title: toolTip });
}

function executeScript(tabId, execScript) {
  chrome.tabs.executeScript(
    tabId,
    {
      code: execScript,
    },
    function (response) {
      // console.log(`typeof(response) :"` + typeof(response) + `"`);
      // console.log(`response[0] :"` + response[0] + `"`);
      // console.log(`response :"` + response + `"`);
      // console.log(`response.toString() :"` + response.toString() + `"`);
      // return response.toString();
    }
  );
}


function initialLoad() {
  const arr = [
{
name : systemDataKey,
regPattForURL : 
`/^chrome.+$/
/^.+(docs|translate|calendar|mail)\.google.+$/
/^.+github.+$/
/^.+amazon.+$/`,
script : 
`// The part enclosed in ** is replaced.
(function(){
function onScroll() {
  document.addEventListener('scroll',  function() {
    const scrollHeight = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight,
      document.body.clientHeight, document.documentElement.clientHeight
    );
    var scrollTop =
      document.documentElement.scrollTop || // IE、Firefox、Opera
      document.body.scrollTop;              // Chrome、Safari
    if (parseInt(scrollHeight - window.innerHeight - scrollTop) < 1) {
      scriptAtBottom();
    };
  });
}

const regPattForURL = **regular expression pattern for url matching**;
console.log(location.href.match(regPattForURL));
const matchedPartInURL = location.href.match(regPattForURL)[0];
**script**
})();`
},
{
name : `Open the link for the next article on カクヨム`,
regPattForURL : 
`/^https:\\/\\/kakuyomu.jp\\/works\\/\\d{19}\\/episodes\\//`,
script : 
`const id = 'contentMain-readNextEpisode';
var nextArticle = '';
const targetElement = document.getElementById(id);
if(('href' in targetElement ) && (targetElement.href.match(regPattForURL)[0] == matchedPartInURL)) {
  nextArticle = targetElement.href;
  onScroll();
}

function scriptAtBottom() {
  location.href = nextArticle;
}`
},
{
name : `Open the link for the next article starting with />|＞|next|次/`,
regPattForURL : 
`/^https:\\/\\/ncode.syosetu.com\\/n\\d{4}\[a-z]{2}\\//
/^https:\\/\\/book.dmm.com\\/library\\//`,
script : 
`const linkTextStartingWith= />|＞|next|次/;
var nextArticle = '';
console.log("matchedPartInURL : " + matchedPartInURL);
const dlinks = document.links;
for (var i = dlinks.length-1; i >= 0; i--){
  var dlink = dlinks[i];
  var dlinkPath = dlink.href;
  console.log("dlinkPath.match : " + dlinkPath.match(regPattForURL));
  if(('textContent' in dlink ) && (dlink.textContent.search(linkTextStartingWith) == 0) &&
    (dlinkPath.match(regPattForURL) == matchedPartInURL)) {
    console.log("dlinkPath : " + dlinkPath);
    nextArticle = dlinkPath;
    onScroll();
    break;
  }
}
function scriptAtBottom() {
  location.href = nextArticle;
}`
},
{
name : `full screen`,
regPattForURL : 
`/^https:\/\/static\.ichijinsha\.co\.jp\/online\/u\/book\/zerosum\//
/^https:\/\/pash\-up\.jp\/viewer\/viewer\.html\?cid\=/
/^https:\/\/comic\-walker\.com\/viewer\//
/^http:\/\/gammaplus\.takeshobo\.co\.jp\/manga\//
/^https:\/\/www\.alphapolis\.co\.jp\/manga\/official\/\d{8,9}\//
/^http:\/\/gammaplus\.takeshobo\.co\.jp\/manga\//
/^https:\/\/seiga.nicovideo.jp\/watch\//
/^https:\/\/viewer\.ganganonline\.com\/manga\//
/^https:\/\/ncode\.syosetu\.com\/n\d{4}[a-z]{2}\//
/^https:\/\/kakuyomu\.jp\/works\/\d{19}\/episodes\/\d{19}/
/^https:\/\/www\.mangabox\.me\/reader\/\d{5}\/episodes\/\d{5}\//
/^https:\/\/comic\.pixiv\.net\/viewer\/stories\//
/^https:\/\/gaugau\.futabanet\.jp\/common\/dld\/zip\//`,
script : 
`document.documentElement.webkitRequestFullScreen();`
},
{
name : `full screen for homepages such as comic-zenon`,
regPattForURL : 
`/^https:\/\/comic-zenon\.com\/episode\//
/^https:\/\/pocket\.shonenmagazine\.com\/episode\//
/^https:\/\/kuragebunch\.com\/episode\//
/^https:\/\/comic\-gardo\.com\/episode\//
/^https:\/\/comic\-days\.com\/episode\//`,
script : 
`document.body.getElementsByClassName("viewer-btn-fullscreen js-viewer-btn-start-fullscreen js-hidden-on-disabled-fullscreen")[0].click();`
},
{
name : `surugayaHP next page`,
regPattForURL : 
`/^https:\\/\\/www.suruga-ya.jp\\/pcmypage\\/action_favorite_list\\/detail\\/\\d{5}\\?page=/`,
script : 
`const title= 'Go to next page';
var nextArticle = '';
console.log("matchedPartInURL : " + matchedPartInURL);
const dlinks = document.links;
for (var i = dlinks.length-1; i >= 0; i--){
  var dlink = dlinks[i];
  var dlinkPath = dlink.href;
  console.log("dlinkPath.match : " + dlinkPath.match(regPattForURL));
  if(('title' in dlink ) && (dlink.title.search(title) == 0) &&
    (dlinkPath.match(regPattForURL) == matchedPartInURL)) {
    console.log("dlinkPath : " + dlinkPath);
    nextArticle = dlinkPath;
    onScroll();
    break;
  }
}
function scriptAtBottom() {
  location.href = nextArticle;
}`
},
{
name : `このマンガがすごい Apply Arrow keys`,
regPattForURL : 
`/^https:\\/\\/tkj.jp\\/ebook\\/read\\/cd\\//`,
script : 
`document.body.addEventListener('keydown', event => {
  if (event.key == 'ArrowLeft') {
    document.getElementById("GestureLeft").children[0].click();
  } else if (event.key == 'ArrowRight') {
    document.getElementById("GestureRight").children[0].click();
  }
});`
}
];

  localStorage.clear();
  localStorage.setItem('systemDataKey', systemDataKey);
  localStorage.setItem('curkey', systemDataKey);
  
  for (let i = 0; i < arr.length; i++) {
    var obj = {[arr[i].name]: {regPattForURL: arr[i].regPattForURL, script: arr[i].script, match: ``}};
    chrome.storage.sync.set(obj, function () {});
  }
  chrome.storage.sync.get(null, function (data) { console.info(data) });
}

// const dlinks = document.links;
// for (var i = dlinks.length-1; i >= 0; i--){
//   var dlink = dlinks[i];
//   var dlinkTarget = dlink.target;
//   console.log("dlink.target : " + dlink.target);
//   if (dlinkTarget != `_blank`) {
//     dlink.Target = '_blank';
//     dlink.rel = 'noopener noreferrer';
//   }
// }

// // 現時点でのruleをクリア(removeRules)して
// chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
//   // 新たなruleを追加する
//   chrome.declarativeContent.onPageChanged.addRules([{
//     conditions: [
//       // アクションを実行する条件
//       new chrome.declarativeContent.PageStateMatcher({
//         pageUrl: {schemes: ['https']}
//       })
//     ],
//     // 実行するアクション
//     actions: [
//       new chrome.declarativeContent.ShowPageAction()
//     ]
//   }]);
// });

// // options.html からの指示を受け取る
// chrome.runtime.onMessage.addListener( function(request,sender,sendResponse) {

//   var srcCommand = request.command
//   var srcValue = request.jstext;
//   var srckey = srcValue.split(/\r\n|\r|\n/)[0];

//   if (srcCommand == "Change") {
//     savejstext(String.fromCharCode(6)+`\n` + srcValue);
//     console.log("set curent : '"+ srckey + "'");
//   }

//   if (srcCommand == "Save") {
//     savejstext(srcValue);
//     console.log("saved '"+ srckey + "'");
//   }

//   if (srcCommand == "Remove") {
//     chrome.storage.sync.remove(srckey, function() {
//       console.log("removed '" + srckey + "'");
//     });
//     // 最初の要素をデフォルトに設定する
//     chrome.storage.sync.get(null, function(items) {
//       firstKey = Object.keys(items)[0];
//       firstValue = items[firstKey];
//       savejstext(String.fromCharCode(6)+`\n` + firstValue );
//       console.log("set curent : '"+ firstKey + "'");
//     });
//   }

//   //一覧を戻す
//   chrome.storage.sync.get(null, function(items) {
//     sendResponse( {allvalue: [items]} );
//     // var allkeys = Object.keys(items);
//     // console.log(allkeys);
//   });

// })