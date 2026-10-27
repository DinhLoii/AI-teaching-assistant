package edu.fpt.prj301.repository;

import edu.fpt.prj301.model.Product;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

public final class ProductRepository {
    private static final ProductRepository INSTANCE = new ProductRepository();
    private final ConcurrentHashMap<Integer, Product> products = new ConcurrentHashMap<>();
    private ProductRepository() {
        products.put(1, new Product(1, "Notebook", 10, new BigDecimal("50.00")));
        products.put(2, new Product(2, "Pen", 20, new BigDecimal("10.00")));
    }
    public static ProductRepository instance() { return INSTANCE; }
    public List<Product> list(String search) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<Product> result = new ArrayList<>();
        for (Product p : products.values()) {
            if (p.getName().toLowerCase(Locale.ROOT).contains(term)) result.add(p);
        }
        result.sort(Comparator.comparingInt(Product::getId));
        return result;
    }
    public Product find(int id) { return products.get(id); }
    public boolean add(Product product) { return products.putIfAbsent(product.getId(), product) == null; }
    public boolean update(Product product) { return products.replace(product.getId(), product) != null; }
    public boolean delete(int id) { return products.remove(id) != null; }
}
