var db = require('../config/connection')
var collection = require('../config/collections')
const collections = require('../config/collections')
const { resolve, reject } = require('promise')
const { response } = require('express')
const { ObjectId } = require('mongodb')
var objectId = require('mongodb').ObjectId

module.exports = {
  addProduct: (product, callback) => {
    let pro = {
      productName: product.productName,
      Category: objectId(product.Category),
      subCategory: product.subCategory,
      brand: product.brand,
      price: parseInt(product.price),
      MRP: parseInt(product.price),
      stock: product.stock,
      description: product.description
    }
    db.get().collection('product').insertOne(pro).then((data) => {
      callback(data.insertedId)
    })
  },
  getAllProductss: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    })
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
        resolve(response)
      })

    })
  },
  getProductDetails: (proId) => {
    return new Promise(async (resolve, reject) => {
      let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })

      resolve(product)
    })
  },
  updateProduct: (proId, productDetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
        $set: {
          productName: productDetails.productName,
          Category: productDetails.Category,
          MRP: productDetails.price,
          stock: productDetails.stock,
          subCategory: productDetails.subCategory,
          brand: productDetails.brand,
          description: productDetails.description
        }
      }, { upsert: true }
      ).then((response) => {
        resolve()
      })
    })
  },
  AddCategory: (data) => {
    return new Promise(async (resolve, reject) => {
      let response = {}
      let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categoryName: data.categoryName })
      console.log(category);
      if (category) {
        response.category = true
        response.data = category.categoryName
        resolve(response)
      }
      else {
        db.get().collection(collection.CATEGORY_COLLECTION).insertOne(data)
        response.category = false
        resolve(response)
      }
    })
  },
  getAllCategory: () => {
    return new Promise(async (resolve, reject) => {
      let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
      console.log(category);
      resolve(category)
    })
  },
  getCategory: (catId) => {
    return new Promise(async (resolve, reject) => {
      let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(catId) })
      resolve(category)
    })
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ status: { $nin: ['pending'] } }).sort({ time: -1 }).toArray()
      resolve(orders)
    })

  },
  changeOrderStatus: (orderId, status) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
        $set: {
          status: status.status
        }
      }).then((response) => {
        resolve(response)
      })
    })
  },

  getDailySales: () => {
    return new Promise(async (resolve, reject) => {

      let dailysales = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        },
        {
          $sort: { _id: 1 },
        }
      ]).toArray()
      resolve(dailysales)
      console.log(dailysales);
    })
  },
  getMonthlySales: () => {
    return new Promise(async (resolve, reject) => {

      let monthlySales = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$time" } },
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        },
        {
          $sort: { _id: 1 },
        }
      ]).toArray()
      resolve(monthlySales)
      console.log(monthlySales);
    })
  },
  getYearlySales: () => {
    return new Promise(async (resolve, reject) => {

      let yearlySales = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$time" } },
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        },
        {
          $sort: { _id: 1 },
        }
      ]).toArray()
      resolve(yearlySales)
      console.log(yearlySales);
    })
  },
  addOffer: (offerData) => {
    offerData.status = true
    return new Promise(async (resolve, reject) => {
      db.get().collection(collection.OFFER_COLLECCTION).insertOne(offerData).then((response) => {
        response.status = true
        resolve(response)
      })

    })
  },
  getAllOffers: () => {
    return new Promise(async (resolve, reject) => {
      let offers = await db.get().collection(collection.OFFER_COLLECCTION).find().toArray()
      resolve(offers)
    })
  },
  deleteOffer: (offreId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.OFFER_COLLECCTION).deleteOne({ _id: objectId(offreId) }).then((response) => {
        resolve(response)
      })
    })
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
        {
          $lookup:
          {
            from: "category",
            localField: "Category",
            foreignField: "_id",
            as: "category"
          }
        }
        ,
        {
          $replaceRoot:
            { newRoot: { $mergeObjects: [{ $arrayElemAt: ["$category", 0] }, "$$ROOT"] } }
        },
        { $project: { fromItems: 0, category: 0 } }

      ]).toArray()
      resolve(products)
    })
  },
  applyProductOffer: (proId, offerId) => {
    return new Promise(async (resolve, reject) => {
      let offer = await db.get().collection(collection.OFFER_COLLECCTION).findOne({ _id: objectId(offerId) })
      let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })
      let dPercentage = offer.dPercentage
      let price = parseInt(product.price)
      await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
        $set: {
          price: parseInt((price - ((price * dPercentage) / 100))),
          dPercentage: dPercentage,
          offerId: offer._id
        }
      })

      resolve(response)
    })
  },
  removeOffer: (proId) => {
    return new Promise(async (resolve, reject) => {
      let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
        $set: {
          price: product.MRP
        }, $unset: {
          'dPercentage': '',
          'offerId': ''
        }
      }
      )
    })
  },
  addCoupon: (coupon) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon)
      resolve(response)
    })
  },
  getCoupons: () => {
    return new Promise(async (resolve, reject) => {
      let coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
      resolve(coupons)
    })
  },
  deleteCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(couponId) }).then((response) => {
        resolve(response)
      })
    })
  },
  getCatProducts: (catId) => {
    return new Promise(async (resolve, reject) => {
      let catProducts = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: objectId(catId) }).toArray()
      resolve(catProducts)
    })
  },
  //------------------add category offer----------------------
  applyCategoryOffer: (catOfferDetails) => {
    console.log(catOfferDetails);
    return new Promise(async (resolve, reject) => {
      products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
        {
          $match: { Category: objectId(catOfferDetails.catId) }
        },
        {
          $set: {
            price: { $subtract: ['$price', ({ $divide: [({ $multiply: ['$price', parseInt(catOfferDetails.cdpercentage)] }), 100] })] },
            offerStatus: true,
            catOfferdpercentage: catOfferDetails.cdpercentage

          }
        }
      ]).toArray()

      await products.map(async (products) => {

        await db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
          { _id: ObjectId(products._id) },
          {
            $set: {
              dPercentage: products.catOfferdpercentage,
              price: parseInt(products.price),
              offerId: objectId()
              // offer_start: data.offer_start,
              // offer_end: data.offer_end,
              // offer_status: data.offer_status,
            },
          }
        );
      });
      await db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
        { _id: objectId(catOfferDetails.catId) },
        {
          $set: {
            offerId: objectId()
          }
        }
      )
      resolve()

    })

  },
  removeCategoryOffer: (catOfferDetails) => {
    console.log(catOfferDetails);
    return new Promise(async (resolve, reject) => {
      products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
        {
          $match: { Category: objectId(catOfferDetails.catId) }
        },
        {
          $set: {
            price: '$MRP',
          }
        }
      ]).toArray()
      console.log(products);

      await products.map(async (products) => {

        await db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
          { _id: ObjectId(products._id) },
          {
            $set: {
              price: parseInt(products.price),
            },
            $unset: {
              'dPercentage': '',
              'offerId': ''
            },
          }
        );
      });
      await db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
        { _id: objectId(catOfferDetails.catId) },
        {
          $unset: {
            offerId: objectId()
          }
        }
      )
      resolve()

    })

  },
  getsalesDetails: (sDate, eDate) => {

    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            date: { $gte: sDate, $lte: eDate },
            status: { $nin: ['cancelled', 'pending'] }
          }
        }
      ]).toArray()
      resolve(orders)
    })
  },
  getSalesTotal: (sDate, eDate) => {
    return new Promise(async (resolve, reject) => {
      let total = 0
      let totalAmount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            date: { $gte: sDate, $lte: eDate }
          }
        },
        {
          $group: {
            _id: null, total: { $sum: "$total" }
          }
        }
      ]).toArray()
      if (totalAmount[0]) {
        total = totalAmount[0].total
      } else {
        total = parseInt(total)
      }
      resolve(total)
    })
  },
  getCodSalesCount: (sDate, eDate) => {
    return new Promise(async (resolve, reject) => {

      let salesCount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] },
            date: { $gte: sDate, $lte: eDate },
            paymentMethod: 'COD'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        }
      ]).toArray()
      if (salesCount[0]) {
        resolve(salesCount[0])
      } else {
        salesCount = {
          _id: null,
          total: 0,
          count: 0
        }
        resolve(salesCount)
      }
    })
  },
  getRazorpaySalesCount: (sDate, eDate) => {
    return new Promise(async (resolve, reject) => {

      let salesCount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] },
            date: { $gte: sDate, $lte: eDate },
            paymentMethod: 'razorpay'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        }
      ]).toArray()
      if (salesCount[0]) {
        resolve(salesCount[0])
      } else {
        salesCount = {
          _id: null,
          total: 0,
          count: 0
        }
        resolve(salesCount)
      }
    })
  },
  getPaypalSalesCount: (sDate, eDate) => {
    return new Promise(async (resolve, reject) => {

      let salesCount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] },
            date: { $gte: sDate, $lte: eDate },
            paymentMethod: 'paypal'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        }
      ]).toArray()
      if (salesCount[0]) {
        resolve(salesCount[0])
      } else {
        salesCount = {
          _id: null,
          total: 0,
          count: 0
        }
        resolve(salesCount)
      }
    })
  },
  getTotalSalesCount: (sDate, eDate) => {
    return new Promise(async (resolve, reject) => {

      let salesCount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "status": { $nin: ['cancelled', 'pending'] },
            date: { $gte: sDate, $lte: eDate },
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            count: { $sum: 1 },
          }
        }
      ]).toArray()
      if (salesCount[0]) {
        resolve(salesCount[0])
      } else {
        salesCount = {
          _id: null,
          total: 0,
          count: 0
        }
        resolve(salesCount)
      }
    })
  },
  getMonthlyReport: () => {
    return new Promise(async (resolve, reject) => {
      let curentdate = new Date()
      let year = curentdate.getFullYear()
      let monthreport = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $project: {
            year: {
              $year: '$time'
            },
            total: 1,
            time: 1
          }
        }, {
          $match: {
            year: year, "status": { $nin: ['cancelled', 'pending'] }
          }
        }, {
          $project: {
            total: 1,
            year: 1,
            month: {
              $month: '$time'
            }
          }
        }, {
          $group: {
            _id: '$month',
            total: {
              $sum: '$total'
            }
          }
        }
      ]).sort({ _id: 1 }).toArray()
      resolve(monthreport)

    })
  },
  getReportPayment: () => {
    let date= new Date()
    let month=(date.getMonth())+1
    return new Promise(async (resolve, reject) => {
        let report = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $project: {
                    month:{$month:"$time"},
                    total: '$total',
                    paymentMethod: '$paymentMethod',
                    status:1
                }
            },
            {
              $match:{
                month: { $eq:month},
                status: { $nin: ['cancelled', 'pending'] }
              }
            },
             {
                $group: {
                    _id: "$paymentMethod",
                    total: {
                        $sum: "$total"
                    }
                }
            }
        ]).sort({_id: -1}).toArray()
        resolve(report)
        console.log('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
        console.log(report);

    })
},


}
