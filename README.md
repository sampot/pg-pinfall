# pg-pinfall

**釘雨落珠**：簡化小鋼珠——發射、撞釘、入洞得分。純前端，無建置步驟。

名稱與盤面為原創小品，致敬「小鋼珠／pachinko」玩法類型，非任一商業機台復刻；純娛樂計分，無關賭博。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。手感想再調？開進來玩，再叫 AI 幫你改一版。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-pinfall&name=%E9%87%98%E9%9B%A8%E8%90%BD%E7%8F%A0)**

```
https://play.samkuo.me/?open=sampot/pg-pinfall&name=釘雨落珠
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

## 操作

| 操作 | 說明 |
| --- | --- |
| **按住發射**／按住盤面下方 | 蓄力（右側力道條） |
| 鬆手 | 彈出珠子 |
| 新局 | 重置分數與三珠 |
| 音效開／關 | 靜音 |

## 規則摘要

- 每局三珠
- 右側軌道發射上樓，再從頂部落入釘雨，撞釘後進底部分數格
- 中央「百」格最高分

## License

MIT
