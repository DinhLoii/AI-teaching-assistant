#include <stdio.h>
#include <string.h>
typedef struct { int id; char name[31]; int quantity, price; } Product;
static Product products[1000];
static int count;
static int find(int id) {
    for (int i=0; i<count; ++i) if (products[i].id==id) return i;
    return -1;
}
static void print_product(int i) {
    printf("%d %s %d %d\n",products[i].id,products[i].name,products[i].quantity,products[i].price);
}
int main(void) {
    int q;
    if (scanf("%d",&q)!=1) return 0;
    while(q-->0) {
        char command[16];
        if(scanf("%15s",command)!=1) return 0;
        if(!strcmp(command,"ADD")) {
            Product p;
            if(scanf("%d %30s %d %d",&p.id,p.name,&p.quantity,&p.price)!=4) return 0;
            if(find(p.id)>=0) puts("EXISTS");
            else if(count<1000) { products[count++]=p; puts("ADDED"); }
        } else if(!strcmp(command,"COUNT")) printf("%d\n",count);
        else if(!strcmp(command,"FIND")) {
            int id; if(scanf("%d",&id)!=1) return 0;
            int i=find(id); if(i<0) puts("NOT FOUND"); else print_product(i);
        } else if(!strcmp(command,"UPDATE")) {
            int id,quantity,price; if(scanf("%d %d %d",&id,&quantity,&price)!=3) return 0;
            int i=find(id);
            if(i<0) puts("NOT FOUND");
            else { products[i].quantity=quantity; products[i].price=price; puts("UPDATED"); }
        } else if(!strcmp(command,"DELETE")) {
            int id; if(scanf("%d",&id)!=1) return 0;
            int i=find(id); if(i<0) puts("NOT FOUND");
            else { for(int j=i;j+1<count;++j) products[j]=products[j+1]; --count; puts("DELETED"); }
        } else if(!strcmp(command,"TOP")) {
            if(!count) puts("EMPTY");
            else {
                int best=0;
                for(int i=1;i<count;++i)
                    if((long long)products[i].quantity*products[i].price >
                       (long long)products[best].quantity*products[best].price) best=i;
                print_product(best);
            }
        }
    }
    return 0;
}
