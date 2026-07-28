from django.contrib import admin

from .models import CartItem, Order, OrderItem, Product, Wishlist

admin.site.register(Product)
admin.site.register(CartItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Wishlist)
