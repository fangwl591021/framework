# Known Limitations

- Deterministic resolver only；AI resolver disabled，無 AI Gateway／Provider API。
- 無 LINE、LIFF、Telegram、Browser Extension、Floating Assistant 或 Flex renderer。
- 無 background scheduler；processing status 與 external retry adapter 保留為未來能力。
- Event create 使用既有 Event public Application Service 的原子 Event＋Session 組合，不增加動態表單或 Domain rule。
- Platform-service access fence 是 local typed boundary；Production composition／Binding 尚未建立。
- 無 Remote D1、Production migration、Binding、Secret、deployment 或 Production verification。
