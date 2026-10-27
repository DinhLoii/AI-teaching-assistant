package edu.fpt.prj301.web;

import edu.fpt.prj301.repository.ProductRepository;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.IOException;

@WebServlet("/products")
public final class PageServlet extends HttpServlet {
    @Override protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        request.setCharacterEncoding("UTF-8");
        response.setContentType("text/html;charset=UTF-8");
        request.setAttribute("products", ProductRepository.instance().list(request.getParameter("q")));
        request.getRequestDispatcher("/WEB-INF/views/products.jsp").forward(request, response);
    }
}
