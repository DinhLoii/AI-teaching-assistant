package edu.fpt.prj301.model;

import java.math.BigDecimal;

public final class Product {
    private final int id;
    private final String name;
    private final int quantity;
    private final BigDecimal price;

    public Product(int id, String name, int quantity, BigDecimal price) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
        this.price = price;
    }
    public int getId() { return id; }
    public String getName() { return name; }
    public int getQuantity() { return quantity; }
    public BigDecimal getPrice() { return price; }
}
