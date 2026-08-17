import FactCheck from "factcheckjs";

const obj = new FactCheck({customerUID: "cus_V58gVV2Z22ftyH"})

const arr = ["mqOeC2gCrc0", "V1UacqDGhB8"]

arr.forEach(async (e) => {
    const target = await obj.getFactChecker(e, 10)
    console.log(target["comments"])
})
