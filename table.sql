CREATE DATABASE POS_DB;
GO

USE POS_DB;
GO

CREATE TABLE Products (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    Stock INT NOT NULL
);
GO

CREATE TABLE Orders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CustomerName NVARCHAR(100) NOT NULL,
    OrderDate DATETIME NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL
);
GO

CREATE TABLE OrderItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrderId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id),
    FOREIGN KEY (ProductId) REFERENCES Products(Id)
);
GO

-- 为数据库启用CDC
EXEC sys.sp_cdc_enable_db;
GO

-- 为Products表启用CDC
EXEC sys.sp_cdc_enable_table
@source_schema = 'dbo',
@source_name = 'Products',
@role_name = NULL,
@supports_net_changes = 1;
GO

-- 为Orders表启用CDC
EXEC sys.sp_cdc_enable_table
@source_schema = 'dbo',
@source_name = 'Orders',
@role_name = NULL,
@supports_net_changes = 1;
GO

-- 为OrderItems表启用CDC
EXEC sys.sp_cdc_enable_table
@source_schema = 'dbo',
@source_name = 'OrderItems',
@role_name = NULL,
@supports_net_changes = 1;
