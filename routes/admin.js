const { response } = require('express');
var express = require('express');
const { addCategory, getCategory, getDailyReport } = require('../helpers/product-helpers');
// const { Session } = require('express-session');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var objectId = require('mongodb').ObjectId
const verify = (req, res, next) => {
  if (req.session.admin) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}


/* GET users listing. */
router.get('/', verify, async (req, res) => {
  let report = await productHelpers.getReportPayment()
  let monthreport = await productHelpers.getMonthlyReport()
  let monarray = []
  let a = 0;
  for (let i = 1; i <= 12; i++) {
    if (monthreport[a]) {
      if (i == monthreport[a]._id) {
        monarray[i - 1] = monthreport[a].total
        a++
      } else {
        monarray[i - 1] = 0
      }
    } else {
      monarray[i - 1] = 0
    }
  }

  let [...monarra] = monarray

  let cod = 0
  let paypal = 0
  let razorpay = 0

  for (let r of report) {
    if (r._id == 'COD') {
      cod = r.total
    } if (r._id == 'paypal') {
      paypal = r.total
    } if (r._id == 'razorpay') {
      razorpay = r.total
    }
  }
  let total = cod + razorpay + paypal
  res.render('admin/admin-dashboard', { adminUi: true, cod, paypal, razorpay, total, monarra })
});
router.get('/login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { adminUi: true, "loginErr": req.session.loginErr })

    req.session.loginErr = false
  }

})

router.post('/login', (req, res) => {
  let credentials = {
    adminId: "admin@gmail.com",
    password: 123
  }
  if (req.body.adminId == credentials.adminId && req.body.password == credentials.password) {
    req.session.admin = true
    res.redirect('/admin')

  } else {

    req.session.loginErr = 'invalid Id or Password'
    res.redirect('/admin/login')
  }
})

//logout

router.get('/logout', (req, res) => {

  req.session.destroy();
  res.redirect('/admin')

})

// add product

router.get('/add-product', verify, (req, res) => {
  productHelpers.getAllCategory().then((category) => {
    console.log(category);
    res.render('admin/add-product', { adminUi: true, category })
  })

})

router.post('/add-product', (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    console.log(id);
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.redirect('/admin/add-product')
      } else {
        console.log(err);
      }
    })
  })
})

router.get('/view-products', verify, (req, res) => {
  productHelpers.getAllProducts().then(async (products) => {
    res.render('admin/view-products', { adminUi: true, products })
  })  
})

router.get('/view-users', verify, (req, res) => {
  userHelpers.getAllUsers().then((users) => {
    res.render('admin/view-users', { adminUi: true, users })
  })
})

router.get('/delete-product/:id', verify, (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view-products')
  })
})

router.get('/edit-product', verify, (req, res) => {
  let proId = req.query.id
  // console.log(proId);
  productHelpers.getProductDetails(proId).then((product) => {
    res.render('admin/edit-product', { adminUi: true, product })
  })
})

router.post('/edit-product:id', (req, res) => {
  let id = req.params.id
  let image = req.files.Image
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/view-products')
    if (req.files.Image) {
      image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})

router.get('/add-category', verify, (req, res) => {
  res.render('admin/add-category', { adminUi: true, "categoryStatus": req.session.categoryStatus })
  req.session.categoryStatus = false
})

router.post('/add-category', (req, res) => {
  productHelpers.
    AddCategory(req.body).then((response) => {

      if (response.category) {
        let category = response.data
        req.session.categoryStatus = `${category} already exists`
        res.redirect('/admin/add-category')
      } else {
        req.session.categoryStatus = 'Category added succesfully'
        res.redirect('/admin/add-category')
      }
    })
})

router.get('/view-orders', verify, (req, res) => {
  productHelpers.getAllOrders().then((orders) => {
    console.log(orders);
    res.render('admin/view-orders', { adminUi: true, orders })
  })
})

router.post('/change-order-status/:id', (req, res) => {
  console.log(req.params);
  console.log(req.body);
  productHelpers.changeOrderStatus(req.params.id, req.body).then((response) => {
    res.json({ status: true })
  })
})

router.get('/sales-report', verify, async (req, res) => {
  let dailySales = await productHelpers.getDailySales()
  let monthlySales = await productHelpers.getMonthlySales()
  let yearlySales = await productHelpers.getYearlySales()
  res.render('admin/sales-report', { adminUi: true, dailySales, monthlySales, yearlySales })
})

// offers

router.get('/manage-offers', verify, async (req, res) => {
  let products = await productHelpers.getAllProducts()
  let offers = await productHelpers.getAllOffers()
  console.log(products);
  console.log(offers);
  res.render('admin/manage-offers', { adminUi: true, products, offers })
})

router.post('/add-offer', (req, res) => {
  productHelpers.addOffer(req.body).then((response) => {
    res.json(response)
  })
})

router.post('/delete-offer/:id', (req, res) => {
  console.log(req.params.id);
  productHelpers.deleteOffer(req.params.id).then((response) => {
    res.json(response)
  })
})

router.post('/apply-offer/:id', (req, res) => {
  console.log(req.params.id);
  console.log(req.body);
  productHelpers.applyProductOffer(req.body.proId, req.body.offerId).then((response) => {
    res.redirect('/admin/manage-offers')
  })
})


router.post('/remove-offer', (req, res) => {
  console.log(req.body);
  productHelpers.removeOffer(req.body.proId)
})

router.get('/coupons', verify, async (req, res) => {
  productHelpers.getCoupons().then((coupons) => {
    res.render('admin/coupons', { adminUi: true, coupons })
  })
})


router.post('/add-coupon', (req, res) => {
  console.log(req.body);
  productHelpers.addCoupon(req.body).then(() => {
    res.json(response)
  })
})

router.post('/delete-coupon/:id', (req, res) => {
  productHelpers.deleteCoupon(req.params.id).then((reponse) => {
    res.json(response)
  })
})

router.get('/cat-offer', async (req, res) => {
  let category = await productHelpers.getAllCategory()
  res.render('admin/category-offer', { adminUi: true, category })
})

router.post('/apply-cat-offer/:id', (req, res) => {
  productHelpers.applyCategoryOffer(req.body).then((response) => {
    res.redirect('/admin/cat-offer')
  })
})

router.post('/remove-cat-offer/:id', (req, res) => {
  console.log(req.body);
  productHelpers.removeCategoryOffer(req.body)
})

router.get('/ordered-products:id', async (req, res) => {
  console.log(req.params.id);
  let products = await userHelpers.getOrderProducts(req.params.id)
  console.log(products);
  res.render('admin/view-orderd-products', { adminUi: true, products })
})

router.post('/detailed-report', (req, res) => {
  console.log(req.body);
  let sDate = req.body.sdate
  let eDate = req.body.edate
  productHelpers.getsalesDetails(sDate, eDate).then(async (orders) => {
    productHelpers.getCodSalesCount(sDate, eDate).then((codOrders) => {
      productHelpers.getRazorpaySalesCount(sDate, eDate).then((razorpayOrders) => {
        productHelpers.getPaypalSalesCount(sDate, eDate).then((paypalOrders) => {
          productHelpers.getTotalSalesCount(sDate, eDate).then((totalOrders) => {
            res.render('admin/dreport', { adminUi: true, orders, totalOrders, codOrders, razorpayOrders, paypalOrders })
          })
        })
      })
    })
  })

})












module.exports = router;
