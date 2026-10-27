#include <stdio.h>
#include <string.h>
typedef struct { int id; char name[31]; int quantity, price; } Product;
static Product products[1000];
static int count;
static int find(int id) {
    for (int i=0; i<count; ++i) if (products[i].id==id) return i;
    return -1;
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
        else if(!strcmp(command,"FIND") || !strcmp(command,"DELETE")) {
            int id; if(scanf("%d",&id)!=1) return 0; puts("UNSUPPORTED");
        } else if(!strcmp(command,"UPDATE")) {
            int id,quantity,price; if(scanf("%d %d %d",&id,&quantity,&price)!=3) return 0;
            puts("UNSUPPORTED");
        } else if(!strcmp(command,"TOP")) puts("UNSUPPORTED");
    }
    return 0;
}
