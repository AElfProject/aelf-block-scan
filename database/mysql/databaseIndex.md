# database index from HyperyPay

```mysql
alter table transactions_unconfirmed add index params_to(params_to);
alter table transactions_unconfirmed add index method(method);
alter table transactions_unconfirmed add index address_to(address_to);
alter table transactions_unconfirmed add index address_from(address_from);


alter table transactions_0 add index params_to(params_to);
alter table transactions_0 add index method(method);
alter table transactions_0 add index address_to(address_to);
alter table transactions_0 add index address_from(address_from);
```
