SET NOCOUNT ON;
GO

-- Q1
SELECT ProductID, ProductName, ListPrice
FROM dbo.Products
WHERE ListPrice >= 100
ORDER BY ListPrice DESC, ProductID ASC;
GO

-- Q2
SELECT o.OrderID, c.CustomerName, o.OrderDate, o.Status,
       CAST(COALESCE(SUM(d.Quantity*d.UnitPrice),0)
            AS DECIMAL(18,2)) AS OrderTotal
FROM dbo.Orders AS o
JOIN dbo.Customers AS c ON c.CustomerID=o.CustomerID
LEFT JOIN dbo.OrderDetails AS d ON d.OrderID=o.OrderID
GROUP BY o.OrderID,c.CustomerName,o.OrderDate,o.Status
ORDER BY o.OrderID;
GO

-- Q3
SELECT c.CustomerID,c.CustomerName,
       CAST(COALESCE(SUM(d.Quantity*d.UnitPrice),0)
            AS DECIMAL(18,2)) AS Revenue
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o ON o.CustomerID=c.CustomerID
    AND o.Status='Completed'
LEFT JOIN dbo.OrderDetails AS d ON d.OrderID=o.OrderID
GROUP BY c.CustomerID,c.CustomerName
ORDER BY Revenue DESC,c.CustomerID ASC;
GO

-- Q4
SELECT p.ProductID,p.ProductName
FROM dbo.Products AS p
WHERE NOT EXISTS (
 SELECT 1 FROM dbo.OrderDetails AS d
 JOIN dbo.Orders AS o ON o.OrderID=d.OrderID
 WHERE d.ProductID=p.ProductID AND o.Status='Completed'
)
ORDER BY p.ProductID;
GO

-- Q5
SELECT TOP (2) p.ProductID,p.ProductName,
       SUM(d.Quantity) AS TotalQuantity
FROM dbo.Products AS p
JOIN dbo.OrderDetails AS d ON d.ProductID=p.ProductID
JOIN dbo.Orders AS o ON o.OrderID=d.OrderID
WHERE o.Status='Completed'
GROUP BY p.ProductID,p.ProductName
ORDER BY TotalQuantity DESC,p.ProductID ASC;
GO

-- Q6
WITH Months AS (
 SELECT MonthNo FROM (VALUES (1),(2),(3),(4)) AS v(MonthNo)
)
SELECT m.MonthNo,
       CAST(COALESCE(SUM(d.Quantity*d.UnitPrice),0)
            AS DECIMAL(18,2)) AS Revenue
FROM Months AS m
LEFT JOIN dbo.Orders AS o ON MONTH(o.OrderDate)=m.MonthNo
 AND o.OrderDate>='20260101' AND o.OrderDate<'20260501'
 AND o.Status='Completed'
LEFT JOIN dbo.OrderDetails AS d ON d.OrderID=o.OrderID
GROUP BY m.MonthNo
ORDER BY m.MonthNo;
GO

-- Q7
SELECT c.CustomerID,c.CustomerName,c.City
FROM dbo.Customers AS c
WHERE NOT EXISTS (
 SELECT 1 FROM dbo.Orders AS o WHERE o.CustomerID=c.CustomerID
)
ORDER BY c.CustomerID;
GO
