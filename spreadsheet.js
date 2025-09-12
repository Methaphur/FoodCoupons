function generateCoupons() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Coupons");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var couponId = row[4]; // CouponID column E
    var name = row[0];
    var email = row[1];
    var count = row[2];
    var slot = row[3];
    
    if (!couponId && email) {
      // Make unique Coupon ID
      couponId = Utilities.getUuid().slice(0,8);
      sheet.getRange(i+1, 5).setValue(couponId);
      
      // QR Data = what scanner reads
      var qrData = JSON.stringify({
        id: couponId,
        name: name,
        email: email,
        count: count,
        slot: slot
      });
      sheet.getRange(i+1, 6).setValue(qrData);
      
      // QR Code image link
      var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" 
                  + encodeURIComponent(qrData);
      sheet.getRange(i+1, 7).setFormula('=IMAGE("' + qrUrl + '")');
      
      // Status
      sheet.getRange(i+1, 8).setValue("Not Sent");
    }
  }
}


function sendCoupons() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Coupons");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = row[0];
    var email = row[1];
    var couponId = row[4];
    var qrData = row[5];
    var status = row[7];
    
    if (email && couponId && status !== "Sent") {
      var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" 
                  + encodeURIComponent(qrData);
      var qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName("coupon.png");
      
      var subject = "Happy Onam! 🎉 Your Food Coupon";
      var body = 
        "Dear " + name + ",\n\n" +
        "Wishing you a very Happy Onam! 🌸\n\n" +
        "We are pleased to share your exclusive food coupon for the event. Attached to this email is your unique QR code, which is valid for the " + row[3] + " time slot. This QR code can be scanned up to " + row[2] + " times, after which it will expire.\n\n" +
        "To redeem your coupon, simply present the attached QR code at the counter. Each scan allows you to enjoy your meal, and once the scan limit is reached, the coupon will no longer be valid.\n\n" +
        "We look forward to celebrating with you!\n\n" +
        "Warm regards,\nOnam Organizing Committee";
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        attachments: [qrBlob]
      });
      
      sheet.getRange(i+1, 8).setValue("Sent");
    }
  }
}
