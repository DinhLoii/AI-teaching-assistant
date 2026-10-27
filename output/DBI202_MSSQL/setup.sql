-- DBI202 / Microsoft SQL Server 2019+
-- Run once in an empty database selected by the teacher.
SET NOCOUNT ON;
CREATE TABLE dbo.Customers (
    CustomerID INT NOT NULL PRIMARY KEY,
    CustomerName NVARCHAR(60) NOT NULL,
    City NVARCHAR(40) NOT NULL
);
CREATE TABLE dbo.Categories (
    CategoryID INT NOT NULL PRIMARY KEY,
    CategoryName NVARCHAR(50) NOT NULL
);
CREATE TABLE dbo.Products (
    ProductID INT NOT NULL PRIMARY KEY,
    ProductName NVARCHAR(60) NOT NULL,
    CategoryID INT NOT NULL REFERENCES dbo.Categories(CategoryID),
    ListPrice DECIMAL(18,2) NOT NULL CHECK (ListPrice >= 0)
);
CREATE TABLE dbo.Orders (
    OrderID INT NOT NULL PRIMARY KEY,
    CustomerID INT NOT NULL REFERENCES dbo.Customers(CustomerID),
    OrderDate DATE NOT NULL,
    Status VARCHAR(10) NOT NULL
        CHECK (Status IN ('Completed','Pending','Cancelled'))
);
CREATE TABLE dbo.OrderDetails (
    OrderID INT NOT NULL REFERENCES dbo.Orders(OrderID),
    ProductID INT NOT NULL REFERENCES dbo.Products(ProductID),
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL CHECK (UnitPrice >= 0),
    CONSTRAINT PK_OrderDetails PRIMARY KEY (OrderID, ProductID)
);

INSERT INTO dbo.Customers VALUES
(1,N'An',N'Ha Noi'),(2,N'Binh',N'Quy Nhon'),
(3,N'Chi',N'Ho Chi Minh'),(4,N'Dung',N'Da Nang'),
(5,N'Ha',N'Hue');
INSERT INTO dbo.Categories VALUES
(1,N'Stationery'),(2,N'Accessories');
INSERT INTO dbo.Products VALUES
(1,N'Pen',1,10.00),(2,N'Notebook',1,50.00),
(3,N'Bag',2,200.00),(4,N'Mouse',2,150.00),
(5,N'Cable',2,80.00),(6,N'Marker',1,20.00);
INSERT INTO dbo.Orders VALUES
(101,1,'20260105','Completed'),
(102,2,'20260110','Completed'),
(103,1,'20260201','Cancelled'),
(104,3,'20260212','Completed'),
(105,2,'20260220','Pending'),
(106,4,'20260302','Completed');
INSERT INTO dbo.OrderDetails VALUES
(101,1,2,10.00),(101,2,1,50.00),
(102,3,1,200.00),(102,1,3,10.00),
(103,4,2,150.00),
(104,2,2,50.00),(104,5,1,80.00),
(105,6,4,20.00),
(106,1,5,10.00),(106,5,1,80.00);
