function validateName() {
    var Name = document.getElementById('nameerr')
    const name = document.getElementById('productName').value;
    if (name == " ") {
        Name.innerHTML = 'Fill The Fields'
        return false
    }
    if (!name.match(/^[a-zA-Z\s-, ]+$/)) {
        Name.innerHTML = 'Numbers and symbols are not allowed'
        return false
    } else {
        Name.innerHTML = null
        return true
    }
}