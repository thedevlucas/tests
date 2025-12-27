// Models
import { User } from "./User";
import { Debtor } from "./Debtor";
import { Cellphone } from "./Cellphone";
import { Telephone } from "./Telephone";
import { debtImages } from "./DebtImage";

// Associations
User.hasMany(Debtor, { onDelete: "cascade", foreignKey: "id_user" });
Debtor.belongsTo(User, { foreignKey: "id_user" });
Debtor.hasMany(Cellphone, { onDelete: "cascade", foreignKey: "id_debtor" });
Cellphone.belongsTo(Debtor, { foreignKey: "id_debtor" });
Debtor.hasMany(Telephone, { onDelete: "cascade", foreignKey: "id_debtor" });
Telephone.belongsTo(Debtor, { foreignKey: "id_debtor" });
Debtor.hasMany(debtImages, { onDelete: "cascade", foreignKey: "id_debtor" });
debtImages.belongsTo(Debtor, { foreignKey: "id_debtor" });
