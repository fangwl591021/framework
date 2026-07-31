# Local Conversational Workbench Demo

瀏覽器可操作的 Local-only 展示層，呼叫正式 Conversational Workbench 與已合併的 Event、Business Network、Application Assembly、Diagnostics adapters。它不是新的 Domain Module，也不是 Production Runtime。

## Start

```bash
npm install
npm run local:setup
npm run local:dev
```

開啟 <http://localhost:8787/local/setup> 完成一鍵 seed，再前往 <http://localhost:8787/local/workbench>。

- [Local Demo Guide](./LOCAL-DEMO-GUIDE.md)
- [Trusted Context](./LOCAL-TRUSTED-CONTEXT.md)
- [Demo Flows](./DEMO-FLOWS.md)
- [Security Boundary](./SECURITY-BOUNDARY.md)
- [Test Matrix](./TEST-MATRIX.md)
- [Known Limitations](./KNOWN-LIMITATIONS.md)