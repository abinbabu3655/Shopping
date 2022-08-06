let db = require('../config/connection')
let collection = require('../config/collections')
const bcrypt = require('bcrypt')
let objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const paypal = require('paypal-rest-sdk');
const { resolve } = require('path')
const { reject } = require('promise')
const { response } = require('express')
let referralCodeGenerator = require('referral-code-generator')


paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AXH69vFTGCh-1IEnxklbpcxWwXeW7uTYnni7SPn0YLJVeb1MLjoOlaQyUEmwJKtvoKRKQW1KTi7KZevI',
    'client_secret': 'EKlEXWc_tba_CKMSbDwDZ4kWQXmLaEhYsEnyB973JdQ-IwyKYJ72yxLQ32tkE1XTuCOlNP1eTZj54ELY'
});

let instance = new Razorpay({
    key_id: 'rzp_test_c7Of720IRAmiHx',
    key_secret: 'criRqobuP8jGTNxa8Ng4bafg',
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.status = true
            userData.wallet = 0
            userData.refferalCode = referralCodeGenerator.alpha('lowercase', 6)
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {

                resolve(data)
            })
        })


    },
    userExist: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let email = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (email) {
                response.user = true
                resolve(response)
            } else {
                response.user = false
                resolve(response)
            }
        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {

                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        response.user = null
                        response.status = false
                        resolve(response)
                    }
                })
            } else {
                response.user = null
                response.status = false
                resolve(response)
            }
        })
    },
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).aggregate([
                { $sort: {
                    status: 1
                }}
            
            ]).toArray()
            resolve(users)
        })

    },
    blockUser: (usrId) => {
        return new Promise(async (resolve, reject) => {
            let userData = await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(usrId) }, {
                $set: {
                    status: false
                }

            })
            resolve(userData)
        })

    },
    unblockUser: (usrId) => {
        return new Promise(async (resolve, reject) => {
            let userData = await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(usrId) }, {
                $set: {
                    status: true
                }

            })

            resolve(userData)
        })
    },
    addTocart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'product.item': objectId(proId) },
                        {
                            $inc: { 'product.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { product: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }
            }
            else {
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    // getCartCount1: (userId) => {
    //     return new Promise(async (resolve, reject) => {
    //         let count = 0
    //         // console.log(objectId(userId));
    //         let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
    //         if (cart) {
    //             count = cart.product.length
    //         }
    //         resolve(count)
    //     })
    // },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: "$product"
                },
                {
                    $project:{
                        quantity: '$product.quantity'
                    }
                },
                {
                    $group: {
                        _id: null,
                        cartItem: { $sum: '$quantity' }
                    }
                }
            ]).toArray()
            console.log('555555555555555555555555555555555555555555555555555555555555555555555555555555555');
            if (cart[0]) {
                count=cart[0].cartItem
            }
            resolve(count)
            console.log(count);
        })
    },

    changeProductQuantity: (details) => {
        count = parseInt(details.count)
        quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (count == -1 && quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { product: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'product.item': objectId(details.product) },
                    {
                        $inc: { 'product.$.quantity': count }
                    }
                ).then((response) => {
                    resolve({ status: true })
                })
            }

        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }, {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            if (total[0]) {
                resolve(total[0].total)
            }
            else {
                total = parseInt(0)
                resolve(total)
            }

        })
    }, getTotalMrp: (userId) => {
        return new Promise(async (resolve, reject) => {
            let totalMrp = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }, {
                    $group: {
                        _id: null,
                        totalMrp: { $sum: { $multiply: ['$quantity', '$product.MRP'] } }
                    }
                }
            ]).toArray()
            if (totalMrp[0]) {
                resolve(totalMrp[0].totalMrp)
            }
            else {
                total = parseInt(0)
                resolve(total)
            }

        })
    },
    getSubtotal: (userId) => {
        return new Promise(async (resolve, reject) => {
            let subTotal = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },

                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        product: 1, _id: 1, quantity: 1,
                        Subtotal: { $multiply: ['$quantity', '$product.price'] }
                    }
                }
            ]).toArray()
            resolve(subTotal)
        })
    },

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                userId: objectId(order.userId),
                deliveryDetails: {
                    address: {
                        fName: order.fName,
                        lName: order.lName,
                        add1: order.add1,
                        add2: order.add2,
                        city: order.city,
                        district: order.district,
                        state: order.state,
                        zip: order.zip,
                    }
                },

                mobile: order.mobile,
                paymentMethod: order.paymentMethod,
                products: products,
                status: status,
                total: total,
                date: new Date().toISOString().slice(0,10),
                time: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {               
                resolve(response.insertedId)

            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.product)

        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderItem = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).sort({time:-1}).toArray()
            resolve(orderItem)
        })
    },
    getOrderProducts: (orderId) => {

        console.log(objectId(orderId));
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }
                , {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$products', 0] }
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    getUserDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userData = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            resolve(userData)
        })
    },
    generateRazorpay: (orderId, totalPrice) => {

        return new Promise((resolve, reject) => {
            let options = {

                amount: totalPrice * 100,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                } else
                    resolve(order)
            })

        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'criRqobuP8jGTNxa8Ng4bafg')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {

        console.log(objectId(orderId));
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }
            ).then(() => {
                resolve()
            })
        })

    },
    addUserAddress: (userAddress, userId) => {
        console.log(userAddress);
        return new Promise((resolve, reject) => {
            userAddress._id = objectId()
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },
                {
                    $push: {
                        "Addresses": userAddress
                    }
                }
            )
            resolve()
        })

    },
    changePassword: (formData, userId) => {
        return new Promise(async (resolve, rejecct) => {
            user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            bcrypt.compare(formData.currentPassword, user.password).then(async (status) => {
                if (status) {
                    if (formData.newPassword == formData.confirmPassword) {
                        Password = await bcrypt.hash(formData.newPassword, 10)
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },
                            {
                                $set: {
                                    password: Password
                                }
                            }
                        )
                        response.status = true
                        resolve(response)


                    }
                } else {
                    let response = {}
                    response.errstatus = 'You are Enterd Wrong Password'
                    resolve(response)
                }
            })


        })
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'cancelled'
                }
            }).then(() => {
                resolve()
            })
        })
    },
    editUserProfile: (userData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userData.userId) },
                {
                    $set: {
                        name: userData.name,
                        email: userData.email,
                        mobile: userData.mobile

                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    getAllUserAddress: (userId) => {
        console.log(userId);
        return new Promise(async (resolve, reject) => {
            let userAddresses = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $unwind: '$Addresses'
                },
                {
                    $project: {
                        addresses: '$Addresses'
                    }
                }
            ]).toArray()


            resolve(userAddresses)

        })
    },
    generatePaypal: (orderId, totalPrice) => {
        return new Promise((resolve, reject) => {
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "Red Sox Hat",
                            "sku": "001",
                            "price": totalPrice,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": totalPrice
                    },
                    "description": "Hat for the best team ever"
                }]
            };



            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    resolve(payment)
                }
            });
        })
    },
    updateAddress: (addressId, userAddress, userId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.USER_COLLECTION).updateOne({
                _id: objectId(userId),
                Addresses: { $elemMatch: { _id: objectId(addressId) } }
            },
                {
                    $set: {
                        "Addresses.$.fName": userAddress.fName,
                        "Addresses.$.lName": userAddress.lName,
                        "Addresses.$.number": userAddress.number,
                        "Addresses.$.email": userAddress.email,
                        "Addresses.$.add1": userAddress.add1,
                        "Addresses.$.add2": userAddress.add2,
                        "Addresses.$.city": userAddress.city,
                        "Addresses.$.district": userAddress.district,
                        "Addresses.$.state": userAddress.state,
                        "Addresses.$.zip": userAddress.zip,
                        "Addresses.$._id": objectId(addressId)

                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    deleteAddress: (addressId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({
                _id: objectId(userId),

            },
                {
                    $pull: {
                        Addresses: { _id: objectId(addressId) }
                    }
                }, false, true
            ).then((r) => {
                resolve(r)
            })
        })
    },
    getOrderDetails: (orderId,userId) => {
        return new Promise(async (resolve, reject) => {
            orderDetails = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userId) })
            resolve(orderDetails)
        })
    },


    applyCoupon: (couponData) => {
        return new Promise(async (resolve, reject) => {
            coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponName: couponData.coupon })
            date = new Date().toDateString()
            console.log(coupon);
            if (coupon) {
                resolve(coupon)
            } else {
                let response = {}
                response.couponErr = 'Coupon Does not Exist'
                resolve(response)
            }

        })

    },
    checkCoupon: (code, ID) => {
        return new Promise(async (resolve, reject) => {
            let CouponCheck = {}
            let Coupons = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponName: code })
            if (Coupons) {

                let Coupon_Exist = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(ID), Coupon: code })
                if (Coupon_Exist) {
                    console.log('existed');
                    CouponCheck.status = true;
                    resolve(CouponCheck)
                }
                else {
                    let date = new Date(Coupons.date)
                    let newDate = new Date()
                    console.log(date);
                    console.log(date);
                    if (date >= newDate) {
                        CouponCheck.newCoupon = false;
                        CouponCheck.value = Coupons.dAmount
                        resolve(CouponCheck)
                    }
                    else {
                        CouponCheck.Expired = true;
                        resolve(CouponCheck)
                    }

                }
            }
            else {
                CouponCheck.notFound = true;
                resolve(CouponCheck)

            }

        })
    },
    AddCouponCart: (ID, code) => {
        return new Promise(async (resolve, reject) => {
            let match = {}
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(ID) })

            if (cart.coupon) {
                if (cart.coupon == code) {
                    match.equal = true;
                    resolve(match)
                }
                else {
                    match.notequal = true;
                    resolve(match)
                }
            }
            else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(ID) }, { $set: { coupon: code } }).then((match) => {
                    resolve(match)
                })

            }



        })
    },
    getCouponValue: (ID) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(ID) })
            if (cart) {
                if (cart.coupon) {
                    let name = cart.coupon
                    let CouponValue = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponName: name })
                    let value = CouponValue.dAmount
                    resolve(value)
                }
                else {
                    resolve(false)
                }
            }
            else {
                resolve(false)
            }

        })
    },
    removeCoupon: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(id) },
                {
                    $unset: {
                        coupon: ''
                    }
                }
            ).then((response) => {
                if (response) {
                    resolve(response)
                }
                else {
                    reject()
                }

            })
        })
    },





}