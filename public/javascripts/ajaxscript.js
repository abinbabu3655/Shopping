function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cartCount').html()
                count = parseInt(count) + 1
                $('#cartCount').html(count)
            }
        }
        
    }).then(()=>{
        swal({
            title: "Good job!",
            text: "Product Added to Cart",
            icon: "success",
        });
    })
    
}
function changeQuantity(cartId, proId, userId, count) {
    let quantity = parseInt(document.getElementById(proId).innerHTML)
    count = parseInt(count)
    $.ajax({
        url: '/change-product-quantity',
        data: {
            user: userId,
            cart: cartId,
            product: proId,
            count: count,
            quantity: quantity
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                swal("Product Removed from Cart").then(()=>{
                    location.reload()
                })
                
            } else {
                document.getElementById(proId).innerHTML = quantity + count
                document.getElementById('total').innerHTML = response.total
                // document.getElementById('total').innerHTML=response.cartData.subTotal.serialize()

                location.reload()


            }

        }
    })
}





$("#apply-coupon-form").submit((e) => {
    e.preventDefault()
    $.ajax({
        url: '/apply-coupon',
        method: 'post',
        data: $('#apply-coupon-form').serialize(),
        success: (response) => {
            if (response.status) {
                swal("coupon Appiled successfully").then(() => {
                    location.reload()
                }
                )

            }
        }
    })

})



$("#pass-change-form").submit((e) => {
    e.preventDefault()
    $.ajax({
        url: '/change-password',
        method: 'post',
        data: $('#pass-change-form').serialize(),
        success: (response) => {
            if (response.status) {
                swal("Password Changed Successfully").then(() => {
                    location.reload()
                }
                )

            }else if(response.errstatus){
                swal(response.errstatus).then(()=>{
                    location.reload()
                })
            }
        }
    })

})

function cancelOrder(orderId) {
    $.ajax({
        url: '/cancel-order/' + orderId,
        method: 'post',
        success: (response) => {
            swal('Order ancelled').then(()=>{
                location.reload()
            })
            

        }
    })
}


$("#edit-profile-form").submit((e) => {
    e.preventDefault()
    $.ajax({
        url: '/edit-profile',
        method: 'post',
        data: $('#edit-profile-form').serialize(),
        success: (response) => {
            if (response.status) {
                swal('Profile Edited Successfully').then(()=>{
                    location.reload()
                })
                

            }
        }

    })

})


function deleteAddress(addressId, userId) {
    $.ajax({
        url: '/delete-address/' + addressId,
        method: 'post',
        data: {
            userId: userId,
            addressId: addressId
        },
        success: (response) => {
            swal('Address Deleted').then(()=>{
                location.reload()
            })
            

        }
    })
}





