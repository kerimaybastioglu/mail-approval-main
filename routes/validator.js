const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");


router.get("/", async (req, res) => {
    return res
        .status(405)
        .send("GET not allowed");
});


router.get(
    "/:processToken",
    async (req, res) => {

        const sToken =
            req.params.processToken;

        if (!sToken) {
            return res
                .status(400)
                .send(
                    "Geçersiz onay numarası"
                );
        }


        jwt.verify(
            sToken,
            process.env.JWT_PRIVATE_KEY,

            function (
                err,
                decoded
            ) {

                if (err) {
                    return res
                        .status(400)
                        .send(
                            "Geçersiz onay numarası"
                        );
                }


                return res
                    .status(200)
                    .send(decoded);
            }
        );
    }
);


module.exports = router;