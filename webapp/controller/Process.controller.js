sap.ui.define(
  [
    "./BaseController",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/TextArea",
    "sap/m/Button",
  ],
  function (Controller, Dialog, VBox, Text, Label, TextArea, Button) {
    "use strict";

    return Controller.extend(
      "workflow.approvals.com.kizilay.controller.Process",
      {
        onInit: function () {
          var oRouter = this.getRouter();

          if (oRouter) {
            var oRoute = oRouter.getRoute("process");

            if (oRoute) {
              oRoute.attachPatternMatched(this._onProcessMatched, this);
            } else {
              setTimeout(
                function () {
                  var oDelayedRoute = oRouter.getRoute("process");

                  if (oDelayedRoute) {
                    oDelayedRoute.attachPatternMatched(
                      this._onProcessMatched,
                      this,
                    );
                  }
                }.bind(this),
                500,
              );
            }
          } else {
            setTimeout(
              function () {
                this._attachRouteEvents();
              }.bind(this),
              1000,
            );
          }
        },

        _attachRouteEvents: function () {
          var oRouter = this.getRouter();

          if (oRouter) {
            var oRoute = oRouter.getRoute("process");

            if (oRoute) {
              oRoute.attachPatternMatched(this._onProcessMatched, this);
            }
          }
        },

        onRefreshPage: function () {
          window.location.reload();
        },

        _onProcessMatched: function () {
          var sToken = $.sap.getUriParameters().get("token");

          var oAppModel = this.getModel("appModel");

          var that = this;

          oAppModel.setProperty("/token", sToken);

          oAppModel.setProperty("/message", {
            visible: false,
          });

          that.openBusyFragment();

          $.ajax({
            url: "./api/validator/" + encodeURIComponent(sToken),

            method: "GET",
          })
            .done(function (oToken) {
              that.closeBusyFragment();

              that._handleProcessEvent(sToken, oToken);
            })
            .fail(function (jqxhr) {
              that.closeBusyFragment();

              // that._showError(
              //   jqxhr.responseJSON?.message ||
              //     jqxhr.responseText ||
              //     "Geçersiz işlem numarası",
              // );
              that._showError(
                (jqxhr.responseJSON && jqxhr.responseJSON.message) ||
                  jqxhr.responseText ||
                  "Geçersiz işlem numarası",
              );
            });
        },

        _handleProcessEvent: function (sToken, oToken) {
          var sProcess = String(oToken.prcid || "")
            .trim()
            .toUpperCase();

          var sAction = String(oToken.actio || "")
            .trim()
            .toUpperCase();
          /*
           * LEAV, TRAV ve BUDG:
           * Önce SAP tarafında işlem hâlâ geçerli mi
           * kontrol edilir.
           */
          if (
            (sProcess === "LEAV" ||
              sProcess === "TRAV" ||
              sProcess === "BUDG") &&
            (sAction === "APPROVE" || sAction === "REJECT")
          ) {
            this._precheckDecision(sToken, oToken);

            return;
          }

          /*
           * Diğer süreçler mevcut şekilde devam eder.
           */
          this._processToken(sToken, oToken, "");
        },

        _precheckDecision: function (sToken, oToken) {
          var that = this;

          that.openBusyFragment();

          $.ajax({
            url: "./api/processor/precheck/" + encodeURIComponent(sToken),

            method: "POST",

            contentType: "application/json",

            data: JSON.stringify({}),
          })
            .done(function (data) {
              that.closeBusyFragment();

              /*
               * İşlem yapılabilir.
               */
              if ((data.TYPE || "").toUpperCase() === "S") {
                that._openDecisionDialog(sToken, oToken);

                return;
              }

              /*
               * Örn:
               * 021 - Bu talep artık onayınızı beklemiyor.
               */
              that._showError(
                data.MESSAGE_V1 || data.MESSAGE || "İşlem yapılamıyor.",
              );
            })
            .fail(function (jqxhr) {
              that.closeBusyFragment();

              that._showError(
                that._getErrorText(jqxhr, "İşlem kontrol edilemedi."),
              );
            });
        },

        _openDecisionDialog: function (sToken, oToken) {
          var that = this;

          var sProcess = String(oToken.prcid || "")
            .trim()
            .toUpperCase();

          var sAction = String(oToken.actio || "")
            .trim()
            .toUpperCase();
          var bReject = sAction === "REJECT";

          /*
           * Red notu sadece izin ve seyahatte zorunlu.
           * Bütçede red notu opsiyonel.
           */
          var bRejectNoteRequired =
            bReject && (sProcess === "LEAV" || sProcess === "TRAV");

          var sDecisionText = bReject ? "Reddet" : "Onayla";

          /*
           * Bütçe karar metinleri.
           */
          if (sProcess === "BUDG") {
            sDecisionText = bReject ? "Bütçeyi reddet" : "Bütçeyi onayla";
          }

          var oTextArea = new TextArea({
            width: "100%",
            rows: 4,
            maxLength: 250,
            growing: false,

            placeholder: bRejectNoteRequired
              ? "Not ekle (zorunlu)"
              : "Not ekle (isteğe bağlı)",
          });

          var oContent = new VBox({
            width: "100%",

            items: [
              new Text({
                text: '"' + sDecisionText + '" seçtiniz.',
              }).addStyleClass("sapUiSmallMarginBottom"),

              new Label({
                text: "Karar notu:",
                required: bRejectNoteRequired,
                labelFor: oTextArea,
              }),

              oTextArea,
            ],
          }).addStyleClass("sapUiSmallMargin");

          var oDialog = new Dialog({
            title: "Kararı gönder",
            contentWidth: "25rem",

            content: [oContent],

            beginButton: new Button({
              text: "Gönder",

              type: bReject ? "Reject" : "Emphasized",

              press: function () {
                var sNote = oTextArea.getValue().trim();

                /*
                 * Red notu yalnız LEAV ve TRAV için zorunlu.
                 * BUDG için boş geçilebilir.
                 */
                if (bRejectNoteRequired && !sNote) {
                  oTextArea.setValueState("Error");

                  oTextArea.setValueStateText("Red gerekçesi zorunludur.");

                  oTextArea.focus();

                  return;
                }

                oTextArea.setValueState("None");

                oDialog.close();

                that._processToken(sToken, oToken, sNote);
              },
            }),

            endButton: new Button({
              text: "İptal et",

              press: function () {
                oDialog.close();
              },
            }),

            afterClose: function () {
              oDialog.destroy();
            },
          });

          this.getView().addDependent(oDialog);

          oDialog.open();
        },

        _processToken: function (sToken, oToken, sNote) {
          var that = this;

          var oAppModel = this.getModel("appModel");

          var sProcessText = oToken.actio + "_ACTION_IN_PROGRESS";

          that.openBusyFragment(sProcessText);

          var oAjaxConfig = {
            url: "./api/processor/" + encodeURIComponent(sToken),
            method: sNote ? "POST" : "GET",
          };

          if (sNote) {
            oAjaxConfig.contentType = "application/json";

            oAjaxConfig.data = JSON.stringify({
              note: sNote,
            });
          }

          $.ajax(oAjaxConfig)
            .done(function (data) {
              that.closeBusyFragment();

              if ((data.TYPE || "").toUpperCase() === "E") {
                oAppModel.setProperty("/message", {
                  type: "Error",
                  icon: "sap-icon://error",

                  text: that.getText("ERROR_OCCURRED"),

                  description:
                    data.MESSAGE_V1 || data.MESSAGE || "İşlem tamamlanamadı.",

                  visible: true,
                });

                return;
              }

              oAppModel.setProperty("/message", {
                type: "Success",

                icon: "sap-icon://message-success",

                text: that.getText("OPERATION_SUCCESSFUL"),

                description:
                  data.MESSAGE_V1 || data.MESSAGE || "İşlem başarılı",

                visible: true,
              });
            })
            .fail(function (jqxhr) {
              that.closeBusyFragment();

              that._showError(
                that._getErrorText(jqxhr, "İşlem tamamlanamadı."),
              );
            });
        },

        _showError: function (sDescription) {
          var oAppModel = this.getModel("appModel");

          oAppModel.setProperty("/message", {
            type: "Error",
            icon: "sap-icon://error",

            text: this.getText("ERROR_OCCURRED"),

            description: sDescription,

            visible: true,
          });
        },

        _getErrorText: function (jqxhr, sDefault) {
          if (jqxhr.responseJSON && jqxhr.responseJSON.message) {
            return jqxhr.responseJSON.message;
          }

          if (jqxhr.responseJSON && jqxhr.responseJSON.MESSAGE_V1) {
            return jqxhr.responseJSON.MESSAGE_V1;
          }

          if (jqxhr.responseJSON && jqxhr.responseJSON.MESSAGE) {
            return jqxhr.responseJSON.MESSAGE;
          }

          return jqxhr.responseText || sDefault;
        },

        onOpenFiori: function () {
          var that = this;

          that.openBusyFragment();

          $.ajax({
            url: "./api/variables",
          })
            .done(function (data) {
              that.closeBusyFragment();

              window.open(
                data["SAP_FIORI_BASE_URL"] + data["SAP_FIORI_URL"],
                "_self",
              );
            })
            .fail(function () {
              that.closeBusyFragment();
            });
        },

        onClosePage: function () {
          window.open("about:blank", "_self");
        },
      },
    );
  },
);
