# FSU-Auto-SBC

## Requirement

[FSU](https://greasyfork.org/scripts/431044) currently tested with v24.17

## Usage

```javascript
// four SBCs will be done by default (if sbcToDo is undefined)
let sbcToDo = [
  "TOTS Warm up Daily login Upgrade",
  "Daily Bronze Upgrade",
  "Daily Bronze Upgrade",
  "Daily Gold Upgrade",
];
let delay = 1.5; // 1.5s by default (if delay is undefined) to avoid softban

await sbc.doDailySBC(sbcToDo, delay);
```

## USE AT YOUR OWN RISK
