const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");

router.get("/", async (req, res) => {
  return res.status(405).send("GET not allowed");
});

/*
 * Popup öncesi kontrol.
 *
 * SAP'ye:
 * PRECHECK_APPROVE
 * PRECHECK_REJECT
 *
 * gönderilir.
 *
 * SAP bu çağrıda karar tamamlamaz.
 */
router.post("/precheck/:processToken", async (req, res) => {
  return processRequest(req, res, "", true);
});

/*
 * Eski kullanım bozulmasın diye GET
 * route'u korunuyor.
 */
router.get("/:processToken", async (req, res) => {
  return processRequest(req, res, "", false);
});

/*
 * Gerçek onay / red işlemi.
 */
router.post("/:processToken", async (req, res) => {
  const sNote = String(req.body?.note || "")
    .trim()
    .substring(0, 250);

  return processRequest(req, res, sNote, false);
});

async function processRequest(req, res, sNote, bPrecheck) {
  const sToken = req.params.processToken;

  if (!sToken) {
    return res.status(400).send({
      success: false,
      message: "Geçersiz işlem numarası",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(sToken, process.env.JWT_PRIVATE_KEY);
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: "Geçersiz işlem numarası",
    });
  }

  //   const sProcess = String(decoded.prcid || "").toUpperCase();

  //   const sAction = String(decoded.actio || "").toUpperCase();
  const sProcess = String(decoded.prcid || "")
    .trim()
    .toUpperCase();

  const sAction = String(decoded.actio || "")
    .trim()
    .toUpperCase();

  console.log("TOKEN PRCID RAW:", JSON.stringify(decoded.prcid));
  console.log("TOKEN PROCESS:", sProcess);
  console.log("TOKEN ACTION:", sAction);
  console.log("PRECHECK:", bPrecheck);
 
  const bDecisionPopup =
    sProcess === "LEAV" || sProcess === "TRAV" || sProcess === "BUDG";

  /*
   * Precheck yalnız desteklenen
   * süreçlerde çalışsın.
   */
  if (bPrecheck && !bDecisionPopup) {
    return res.status(400).send({
      success: false,
      message: "Bu süreç için ön kontrol desteklenmiyor.",
    });
  }

  if (bPrecheck && sAction !== "APPROVE" && sAction !== "REJECT") {
    return res.status(400).send({
      success: false,
      message: "Geçersiz işlem bilgisi",
    });
  }
  const bRejectNoteRequired = sProcess === "LEAV" || sProcess === "TRAV";

  if (!bPrecheck && bRejectNoteRequired && sAction === "REJECT" && !sNote) {
    return res.status(400).send({
      success: false,
      message: "Red gerekçesi zorunludur.",
    });
  }

  let sServiceUrl;
  let sPassword;

  if (decoded.sysid === "KED" || decoded.sysid === "KEQ") {
    sServiceUrl = process.env.SAP_SERVICE_2;

    sPassword = process.env.SAP_PASSWORD;
  } else if (decoded.sysid === "KEP") {
    sServiceUrl = process.env.SAP_SERVICE_PRD;

    sPassword = process.env.SAP_PASSWORD_PRD;
  } else {
    return res.status(400).send({
      success: false,
      message: "Geçersiz sistem bilgisi",
    });
  }

  /*
   * SAP'ye gönderilecek action.
   *
   * Precheck:
   * PRECHECK_APPROVE
   * PRECHECK_REJECT
   *
   * Normal:
   * APPROVE
   * APPROVE|Not
   * REJECT|Gerekçe
   */
  let sSapAction;

  if (bPrecheck) {
    sSapAction = `PRECHECK_${sAction}`;
  } else {
    sSapAction = sAction;

    if (bDecisionPopup && sNote) {
      sSapAction = `${sAction}|${sNote}`;
    }
  }

  const requestData = {
    IV_ACTIO: sSapAction,

    IV_APPNO: decoded.appno,

    IV_DOCID: decoded.docid,

    IV_PRCID: decoded.prcid,

    IV_SYSID: decoded.sysid,

    IV_UNAME: decoded.uname,

    IV_APPNO2: decoded.appno2,
  };

  try {
    console.log("SYSID:", decoded.sysid);

    console.log("PROCESS:", sProcess);

    console.log("ACTION:", sSapAction);

    console.log("PRECHECK:", bPrecheck);

    console.log("SAP URL:", sServiceUrl);

    console.log("REQUEST DATA:", JSON.stringify(requestData));

    const response = await axios({
      method: "post",

      maxBodyLength: Infinity,

      url: sServiceUrl,

      headers: {
        "Content-Type": "application/json",
      },

      auth: {
        username: process.env.SAP_USERNAME,

        password: sPassword,
      },

      data: requestData,
    });

    console.log("SAP STATUS:", response.status);

    console.log("SAP RESPONSE:", response.data);

    const item = response.data?.ET_RETURN2?.item;

    if (!item) {
      console.error("ET_RETURN2 veya item bulunamadı");

      return res.status(400).send({
        success: false,
        message: "Yanıt formatı hatalı",
      });
    }

    return res.status(200).send(item);
  } catch (error) {
    console.error("SAP çağrısı başarısız");

    console.error("ERROR MESSAGE:", error.message);

    if (error.response) {
      console.error("SAP STATUS:", error.response.status);

      console.error("SAP RESPONSE:", error.response.data);
    }

    return res.status(400).send({
      success: false,
      message: "Onay sistemine bağlantı başarısız.",
    });
  }
}

module.exports = router;
