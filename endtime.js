// し　く　み
// （こんな）ニコ生でも片手で数えるぐらいAPIがあって、
// programinfoとかgetplayerstatusで番組の終了時刻から開始時間を引けば求まるけど
// よわよわサーバーで定期的にAPI叩くのもなあというわけで
// ニコ生PC版と同じくWebSocketに接続して延長を検知することにする。
// しかし
//

//URL取得。Chrome Extension APIにもURL取得APIあるけどJavaScriptで取ったほうが簡単
const url = location.href

//fetch APIを利用してリクエストしている。XHRだとどうしてもCookieが入ってしまうので。（非ログインでリクエストしたい。user_sessionなしで）
//credentials:'omit'でCookieを送らないようにできる。
fetch(url, { credentials: 'omit' })
    .then(function (response) {
        //非同期処理だって。わからん アロー関数で省略できて有能
        response.clone().text().then(value => {
            //HTML取得
            //documentの形に変換
            const domParser = new DOMParser()
            const nicoLiveDocument = domParser.parseFromString(value, 'text/html')
            //JSONをHTMLから取り出す
            const scripts = nicoLiveDocument.getElementsByTagName('script')
            let jsonString
            for (let index = 0; index < scripts.length; index++) {
                const element = scripts[index];
                if (element.getAttribute('data-props') != null) {
                    jsonString = element.getAttribute('data-props')
                }
            }
            //JSONパース。getplayerstatusはxmlだったので進化している。
            const json = JSON.parse(jsonString)
            console.log(json)

            //現在放送中かどうか
            if (json.program.status === "ON_AIR") {
                //放送中なら利用
                //とりあえず残りの時間（枠の時間）を入れるSpan作成しておく
                const span = document.createElement('span')
                span.innerHTML = '/残りの時間'
                document.getElementsByClassName('___elapsed-time___1Zjpy')[0].append(span)
                const webSocketAddress = json.site.relive.webSocketUrl
                //その他、WebSocket接続時に送信するJSONに必要なデータを集める
                const broadcastId = json.program.broadcastId
                //送るJSON、2つある模様。
                const sendJSON = {
                    "type": "watch",
                    "body": {
                        "command": "getpermit",
                        "requirement": {
                            "broadcastId": broadcastId,
                            "route": "",
                            "stream": {
                                "protocol": "hls",
                                "requireNewStream": true,
                                "priorStreamQuality": "high",
                                "isLowLatency": true,
                                "isChasePlay": false
                            },
                            "room": {
                                "isCommentable": true,
                                "protocol": "webSocket"
                            }
                        }
                    }
                }
                const sendJSON_2 = {
                    "type": "watch",
                    "body": {
                        "command": "playerversion",
                        "params": [
                            "leo"
                        ]
                    }
                }
                //Websocket
                const webSocket = new WebSocket(webSocketAddress + '&frontend_id=12')
                webSocket.addEventListener('open', function (event) {
                    //接続開始時にJSONを送る
                    webSocket.send(JSON.stringify(sendJSON_2))
                    webSocket.send(JSON.stringify(sendJSON))
                })
                webSocket.addEventListener('message', function (event) {
                    //番組延長は「command: "schedule"」であれば延長JSON
                    const json = JSON.parse(event.data)
                    if (json.body.command == "schedule") {
                        console.log('延長検知')
                        console.log(json)
                        //開始時間と終了時間取る
                        const beginTime = json.body.update.begintime
                        const endTime = json.body.update.endtime
                        //終了時間-開始時間する
                        const calc = (endTime - beginTime) / 1000
                        //算数の時間。
                        //時間を出す
                        const hour = calc / 3600
                        //一桁のときは先頭に0を足す
                        let hourString = new String(parseInt(hour, 10))
                        if (hourString.length == 1) {
                            hourString = `0${hourString}`
                        }
                        //分を出す。なぜこうなるかはわからん。
                        const minute = calc % 3600 / 60
                        let minuteString = new String(minute)
                        if (minuteString.length == 1) {
                            minuteString = `0${minuteString}`
                        }
                        //最後にHTMLに追加する。
                        //秒数はいらんけど放送時間は秒まであるので・・合わせてみる
                        span.innerHTML = `&nbsp;/&nbsp;${hourString}:${minuteString}:00`
                    }
                })
                //視聴継続メッセージJSON
                const watchingJSON = {
                    "type": "watch",
                    "body": {
                        "command": "watching", "params": [broadcastId, "-1", "0"]
                    }
                }
                setInterval(function () {
                    if (webSocket.readyState === WebSocket.OPEN) {
                        webSocket.send(JSON.stringify(watchingJSON))
                    }
                }, 1000 * 30)
            }

        })
    })
