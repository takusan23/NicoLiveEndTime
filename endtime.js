window.onload = function () {

    //タイムシフトか生放送か分ける。めっちゃ雑
    if (document.getElementsByClassName('___elapsed-time___1Zjpy')[0].childElementCount == 2) {

        //とりあえず残りの時間（枠の時間）を入れるSpan作成しておく
        const span = document.createElement('span')
        span.innerHTML = '/残りの時間'
        document.getElementsByClassName('___elapsed-time___1Zjpy')[0].append(span)

        // 本当はprograminfoとかgetplayerstatusの終了時刻-開始時間すれば求まるけど
        // よわよわサーバーで定期的にAPI叩くのもなあというわけで
        // ニコ生PC版と同じくWebSocketに接続して延長を検知することにする。

        //JSONをHTMLから取り出す
        const scripts = document.getElementsByTagName('script')
        let jsonString
        for (let index = 0; index < scripts.length; index++) {
            const element = scripts[index];
            if (element.getAttribute('data-props') != null) {
                jsonString = element.getAttribute('data-props')
            }
        }
        //JSONパース。getplayerstatusはxmlだったので進化している。
        const json = JSON.parse(jsonString)
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
                        "priorStreamQuality": "super_high",
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
        const webSocket = new this.WebSocket(webSocketAddress)
        webSocket.addEventListener('open', function (event) {
            //接続開始時にJSONを送る
            webSocket.send(JSON.stringify(sendJSON_2))
            webSocket.send(JSON.stringify(sendJSON))
        })
        webSocket.addEventListener('message', function (event) {
            //番組延長は「command: "schedule"」であれば延長JSON
            const json = JSON.parse(event.data)
            if (json.body.command == "schedule") {
                //開始時間と終了時間取る
                const beginTime = json.body.update.begintime
                const endTime = json.body.update.endtime

                //終了時間-開始時間する
                const calc = (endTime - beginTime) / 1000

                //算数の時間。
                //時間を出す
                const hour = calc / 3600
                //一桁のときは先頭に0を足す
                let hourString = new String(hour)
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
                span.innerHTML = `&nbsp;/&nbsp;${hourString}:${minuteString}`

            }
        })

        //視聴継続メッセージJSON
        const watchingJSON = {
            "type": "watch",
            "body": {
                "command": "watching", "params": [broadcastId, "-1", "0"]
            }
        }
        this.setInterval(function () {
            webSocket.send(JSON.stringify(watchingJSON))
        }, 1000 * 30)

    }

}