CREATE TABLE Members(memberID int PRIMARY KEY,firstName nvarchar(50),lastName nvarchar(50));
CREATE TABLE MembersPhone(memberID int,phone nvarchar(20),PRIMARY KEY(memberID,phone),FOREIGN KEY(memberID) REFERENCES Members(memberID));
CREATE TABLE Librarian(librarianID int PRIMARY KEY,name nvarchar(100));
CREATE TABLE Books(bookCode nvarchar(20) PRIMARY KEY,author nvarchar(60),title nvarchar(100));
CREATE TABLE Loans(memberID int,bookCode nvarchar(20),borrowDate date,returnDate date,librarianID int,PRIMARY KEY(memberID,bookCode,borrowDate),FOREIGN KEY(memberID) REFERENCES Members(memberID),FOREIGN KEY(bookCode) REFERENCES Books(bookCode),FOREIGN KEY(librarianID) REFERENCES Librarian(librarianID));
