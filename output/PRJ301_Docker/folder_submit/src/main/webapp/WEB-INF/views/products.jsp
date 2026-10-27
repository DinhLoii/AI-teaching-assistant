<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" %>
<%@ page import="java.util.List,edu.fpt.prj301.model.Product" %>
<%!
private String html(String value) {
    return value == null ? "" : value.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");
}
%>
<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"><title>PRJ301 - Product Manager</title>
<style>body{font:16px Arial,sans-serif;max-width:960px;margin:48px auto;padding:0 24px;color:#17324d;background:#f4f7fb}main{background:white;padding:32px;border-radius:16px}h1{margin-top:0}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{text-align:left;padding:12px;border-bottom:1px solid #dbe2ec}th{background:#17324d;color:white}input,button{padding:10px;border-radius:6px;border:1px solid #ccd5df}button{background:#e96820;color:white;cursor:pointer}small{color:#596b80}</style>
</head><body><main><h1>PRJ301 - Quản lý sản phẩm</h1><small>Java Servlet / JSP / Maven / Tomcat 9</small>
<form method="get" action="<%= request.getContextPath() %>/products" style="margin-top:24px">
<label for="q">Tìm theo tên</label> <input id="q" name="q" maxlength="100" value="<%= html(request.getParameter("q")) %>"><button type="submit">Tìm kiếm</button></form>
<table><thead><tr><th>ID</th><th>Tên</th><th>Số lượng</th><th>Đơn giá</th></tr></thead><tbody>
<% List<Product> products=(List<Product>)request.getAttribute("products"); for(Product product:products){ %>
<tr><td><%= product.getId() %></td><td><%= html(product.getName()) %></td><td><%= product.getQuantity() %></td><td><%= product.getPrice().toPlainString() %></td></tr>
<% } if(products.isEmpty()){ %><tr><td colspan="4">Không có sản phẩm</td></tr><% } %>
</tbody></table><p>CRUD qua JSON API: <code>/api/products</code></p></main></body></html>
