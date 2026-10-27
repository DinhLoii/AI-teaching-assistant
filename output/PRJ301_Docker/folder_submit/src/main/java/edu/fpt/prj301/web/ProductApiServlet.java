package edu.fpt.prj301.web;

import com.google.gson.*;
import edu.fpt.prj301.model.Product;
import edu.fpt.prj301.repository.ProductRepository;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@WebServlet("/api/products/*")
public final class ProductApiServlet extends HttpServlet {
    private final Gson gson = new Gson();
    private final ProductRepository repository = ProductRepository.instance();
    private void json(HttpServletResponse response, int status, Object value) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        gson.toJson(value, response.getWriter());
    }
    private void error(HttpServletResponse response, int status, String message) throws IOException {
        json(response, status, Map.of("error", message));
    }
    private boolean collection(HttpServletRequest request) {
        return request.getPathInfo() == null || request.getPathInfo().equals("/");
    }
    private int pathId(HttpServletRequest request) {
        String path = request.getPathInfo();
        if (path == null || !path.matches("/[1-9][0-9]*")) throw new IllegalArgumentException();
        return Integer.parseInt(path.substring(1));
    }
    private Product parse(HttpServletRequest request, Integer forcedId) throws IOException {
        request.setCharacterEncoding("UTF-8");
        JsonElement raw = JsonParser.parseReader(request.getReader());
        if (!raw.isJsonObject()) throw new IllegalArgumentException();
        JsonObject object = raw.getAsJsonObject();
        int id = forcedId == null ? integer(object, "id") : forcedId;
        JsonElement nameValue = object.get("name");
        if (nameValue == null || !nameValue.isJsonPrimitive() || !nameValue.getAsJsonPrimitive().isString()) throw new IllegalArgumentException();
        String name = nameValue.getAsString().trim();
        int quantity = integer(object, "quantity");
        JsonElement priceValue = object.get("price");
        if (priceValue == null || !priceValue.isJsonPrimitive() || !priceValue.getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException();
        BigDecimal price = priceValue.getAsBigDecimal();
        if (id <= 0 || name.isEmpty() || name.length() > 100 || quantity < 0 || quantity > 1000000 || price.signum() < 0 || price.compareTo(new BigDecimal("1000000000")) > 0) throw new IllegalArgumentException();
        return new Product(id, name, quantity, price);
    }
    private int integer(JsonObject object, String key) {
        JsonElement value = object.get(key);
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException();
        return value.getAsBigDecimal().intValueExact();
    }
    @Override protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (collection(request)) {
            List<Product> items = repository.list(request.getParameter("q"));
            json(response, 200, Map.of("items", items, "total", items.size()));
            return;
        }
        try {
            Product product = repository.find(pathId(request));
            if (product == null) error(response, 404, "NOT_FOUND");
            else json(response, 200, product);
        } catch (IllegalArgumentException e) { error(response, 400, "INVALID_INPUT"); }
    }
    @Override protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!collection(request)) { error(response, 405, "METHOD_NOT_ALLOWED"); return; }
        try {
            Product product = parse(request, null);
            if (!repository.add(product)) error(response, 409, "DUPLICATE_ID");
            else json(response, 201, product);
        } catch (RuntimeException e) { error(response, 400, "INVALID_INPUT"); }
    }
    @Override protected void doPut(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            int id = pathId(request);
            Product product = parse(request, id);
            if (!repository.update(product)) error(response, 404, "NOT_FOUND");
            else json(response, 200, product);
        } catch (RuntimeException e) { error(response, 400, "INVALID_INPUT"); }
    }
    @Override protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            if (!repository.delete(pathId(request))) error(response, 404, "NOT_FOUND");
            else response.setStatus(204);
        } catch (IllegalArgumentException e) { error(response, 400, "INVALID_INPUT"); }
    }
}
