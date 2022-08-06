var express = require('express');
const session = require('express-session');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var otp = require('../helpers/otp')
require('dotenv').config()
const SSID=process.env.serviseSID
const ASID=process.env.accountSID
const AUID=process.env.authToken
var client = require('twilio')(ASID,AUID)
const paypal = require('paypal-rest-sdk');
var shortid = require('shortid');
const { response } = require('express');

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedin) {
    next()
  } else {
    res.redirect('/login')
  }
}
const verify = (req, res, next) => {
  if (req.session.signup) {
    next()
  } else {
    res.redirect('/')
  }
}


/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('users/index', { userUi: true, products, user, cartCount });
  })

});

router.get('/shop', async (req, res) => {
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)
    req.session.cartCount = cartCount
  }
  productHelpers.getAllProducts().then(async (products) => {
    let category = await productHelpers.getAllCategory()
    res.render('users/shop', { userUi: true, products, user, cartCount, category })
  })

})


router.get('/category-views:id', async (req, res) => {
  let catProducts = await productHelpers.getCatProducts(req.params.id)
  let category = await productHelpers.getAllCategory()
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)
  }
  res.render('users/products-category-view', { userUi: true, category, catProducts, user, cartCount })
})



router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('users/login-page', { "loginErr": req.session.userloginErr })
    req.session.userloginErr = false

  }

})
router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {

    if (response.status) {
      if (response.user.status) {
        req.session.user = response.user
        req.session.userLoggedin = true
        res.redirect('/')
      } else {
        req.session.userloginErr = 'User Blocked'
        res.redirect('/login')
      }
    }
    else {
      req.session.userloginErr = 'invalid user or password'
      res.redirect('/login')
    }
  })
  // res.redirect('/')
})

router.get('/logout', (req, res) => {

  req.session.user = null
  req.session.userLoggedin = false
  res.redirect('/')
})

router.get('/signup', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else
    res.render('users/signup-page', { userexistErr: req.session.userexistErr })
  req.session.userexistErr = false
  req.session.signup = true
})

router.post('/signup', (req, res) => {
  userHelpers.userExist(req.body).then((response) => {
    if (response.user) {
      req.session.userexistErr = 'User already exist'
      res.redirect('/signup')
    } else {
      // otptextMessage
      var Number = req.body.mobile
      req.session.phone = Number
      req.session.userdata = req.body
      client.verify
        .services(SSID)
        .verifications
        .create({
          to: `+91${Number}`,
          channel: 'sms'
        })
        .then((data) => {

          res.redirect('/otp-verify')
        })
    }
  })
})

router.get('/otp-verify', verify, (req, res) => {
  res.render('users/otpVerify')
})

router.post('/otp-verify', (req, res) => {
  var Number = req.session.phone
  var otps = req.body.number
  client.verify
    .services(SSID)
    .verificationChecks.create({
      to: `+91${Number}`,
      code: otps
    })
    .then((data) => {
      if (data.status == 'approved') {
        userHelpers.doSignup(req.session.userdata).then((response) => {
          req.session.signup = false
          res.redirect('/login')
        })
      } else {
        otpErr = 'Invalid OTP'
        res.redirect('/otpVerify', { otpErr, Number })
      }

    });

})

// single-product route

router.get('/single-product:id', (req, res) => {
  let user = req.session.user
  productHelpers.getProductDetails(req.params.id).then((product) => {
    let catId = product.Category
    productHelpers.getCategory(catId).then((category) => {
      res.render('users/single-product', { userUi: true, product, user, category })
    })

  })

})


// block User  unblock
router.get('/admin/block-user/:id', (req, res) => {
  let id = req.params.id
  console.log(id);
  userHelpers.blockUser(id).then((response) => {
    res.redirect('/admin/view-users')
  })
})


router.get('/admin/unblock-user/:id', (req, res) => {
  let id = req.params.id
  userHelpers.unblockUser(id).then((response) => {
    res.redirect('/admin/view-users')
  })
})

router.get('/cart', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let subTotal = await userHelpers.getSubtotal(req.session.user._id)
  let totalMrp = await userHelpers.getTotalMrp(req.session.user._id)
  let discount = totalMrp - total
  user = req.session.user
  res.render('users/cart', { userUi: true, user, products, total, subTotal, totalMrp, discount })
})


router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  userHelpers.addTocart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let Addresses = await userHelpers.getAllUserAddress(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let subTotal = await userHelpers.getSubtotal(req.session.user._id)
  req.session.subTotal = subTotal
  let totalMrp = await userHelpers.getTotalMrp(req.session.user._id)
  let savedAddress = req.session.userSavedAddress
  let discount = totalMrp - total
  let value = 0
  value = await userHelpers.getCouponValue(req.session.user._id)
  if (value) {
    discount = discount + parseInt(value)
    total = total - parseInt(value)
  } else {
    value = 0
  }

  req.session.totalMRP = totalMrp
  req.session.discount = discount
  res.render('users/checkout', { userUi: true, total, user: req.session.user, Addresses, products, subTotal, 
  savedAddress, totalMrp, discount, value })
  req.session.userSavedAddress = null
})

router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  let value = 0
  value = await userHelpers.getCouponValue(req.session.user._id)
  if (value) {
    totalPrice = totalPrice - parseInt(value)
  } else {
    value = 0
  }
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    req.session.orderId = orderId

    if (req.body.paymentMethod == 'COD') {
      res.json({ codSuccess: true })
      req.session.cartCount = null
    } else if (req.body.paymentMethod == 'razorpay') {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json({ onlineSuccess: true, response })
        req.session.cartCount = null
      })
    } else {
      userHelpers.generatePaypal(orderId, totalPrice).then((response) => {
        req.session.total = totalPrice
        req.session.orderId = orderId
        response.paypalSuccess = true
        res.json(response)
        req.session.cartCount = null
      })
    }
  })
})

router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  let user = req.session.user
  res.render('users/view-orders', { userUi: true, user, orders })
})

router.get('/view-order-products:id', verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  let user = req.session.user
  res.render('users/view-order-products', { userUi: true, user, products })
})

router.get('/user-profile', verifyLogin, async (req, res) => {
  let userAddresses = await userHelpers.getAllUserAddress(req.session.user._id)
  let user = await userHelpers.getUserDetails(req.session.user._id)
  res.render('users/user-profile', { userUi: true, user, userAddresses })
})

router.get('/user-address', verifyLogin, (req, res) => {
  userHelpers.getAllUserAddress(req.session.user._id).then((Addresses) => {
    res.render('users/view-address', { userUi: true, Addresses, user: req.session.user })
  })

})

router.post('/verify-payment', (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch(() => {
    res.json({ status: false, errMsg: 'Payment Failed' })
  })


})

router.post('/add-address/:id', (req, res) => {
  userHelpers.addUserAddress(req.body, req.params.id).then(() => {
    res.redirect('/user-address')
  })
})

router.get('/change-password', verifyLogin, (req, res) => {
  res.render('users/change-password', { userUi: true, user: req.session.user })

})

router.post('/change-password', verifyLogin, (req, res) => {
  let userId = req.session.user._id
  userHelpers.changePassword(req.body, userId).then((response) => {
    res.json(response)
  })
})

router.post('/cancel-order/:id', verifyLogin, (req, res) => {
  userHelpers.cancelOrder(req.params.id).then((response) => {
    res.json({ status: true })
  })
})

router.post('/edit-profile', (req, res) => {
  userHelpers.editUserProfile(req.body).then((response) => {
    res.json({ status: true })
  })
})

router.get('/success', (req, res) => {
  totalPrice = req.session.total
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": totalPrice
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      userHelpers.changePaymentStatus(req.session.orderId)
      req.session.total = null
      res.redirect('/order-success')
    }
  });
});



router.post('/edit-address/:id', (req, res) => {
  userHelpers.updateAddress(req.params.id, req.body, req.body.userId).then((response) => {
    res.redirect('/user-address')
  })
})


router.post('/delete-address/:id', (req, res) => {
  userHelpers.deleteAddress(req.body.addressId, req.body.userId).then((response) => {
    res.json(response)
  })

})

router.post('/fill-address', (req, res) => {
  req.session.userSavedAddress = req.body
  res.redirect('/place-order')

})

router.post('/apply-coupon', (req, res) => {
  let coupon = req.body.coupon
  userHelpers.checkCoupon(coupon, req.session.user._id).then((check) => {
    if (check.status) {
      res.json({ status: true })
    } else if (check.notFound) {
      res.json({ notFound: true })
    } else {
      if (check.Expired) {
        res.json({ Expired: true })
      } else {
        req.session.usedCoupon = coupon
        userHelpers.AddCouponCart(req.session.user._id, coupon).then((match) => {
          if (match.equal) {
            res.json(match)
          }
          else if (match.notequal) {
            res.json(match)
          }
          else {
            match.apply = true
            res.json(match)
          }
        })
      }
    }
  })
})


router.get('/order-success', verifyLogin, (req, res) => {
  let orderId = req.session.orderId
  let user = req.session.user
  userHelpers.getOrderDetails(orderId, user._id).then(async (orderDetails) => {
    let products = await userHelpers.getOrderProducts(orderDetails._id)
    let subTotal = req.session.subTotal
    let totalMRP = req.session.totalMRP
    let discount = req.session.discount
    res.render('users/order-success-page', { userUi: true, user, orderDetails, products, subTotal, totalMRP, discount })
    req.session.orderId = null
  })
})

router.post('/remove-coupon/:id', (req, res) => {
  userHelpers.removeCoupon(req.params.id).then((response) => {
    res.json(response)
  })
})


module.exports = router;







